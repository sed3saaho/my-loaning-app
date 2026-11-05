import datetime
from decimal import Decimal
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import Client, Loan, Payment, PaymentAllocation, CashbookEntry, AuditLog
from app.schemas import DashboardSummaryResponse, LoanResponse
from app.services.cashbook_service import get_cashbook_summary
from app.services.loan_service import quantize_money, refresh_loan_statuses

def get_dashboard_summary(db: Session) -> DashboardSummaryResponse:
    refresh_loan_statuses(db)
    today = datetime.date.today()

    total_clients = db.query(Client).count()

    all_loans = db.query(Loan).all()
    active_loans = [l for l in all_loans if l.loan_status in ["ACTIVE", "PARTIALLY_PAID"]]
    matured_loans = [l for l in all_loans if l.loan_status == "MATURED"]
    overdue_loans = [
        l for l in all_loans
        if l.maturity_date < today and (l.outstanding_principal + l.outstanding_interest) > 0 and l.loan_status != "ROLLED_OVER"
    ]
    due_today_loans = [
        l for l in all_loans
        if l.maturity_date == today and (l.outstanding_principal + l.outstanding_interest) > 0
    ]
    awaiting_rollover = [
        l for l in all_loans
        if l.loan_status in ["MATURED", "AWAITING_ROLLOVER"] and l.outstanding_principal > 0 and l.rollover_status != "PROCESSED"
    ]

    total_disbursed = sum((l.principal_amount for l in all_loans), Decimal("0.00"))
    out_principal = sum(
        (l.outstanding_principal for l in all_loans if l.loan_status not in ["FULLY_PAID", "ROLLED_OVER", "CANCELLED", "WRITTEN_OFF"]),
        Decimal("0.00")
    )
    out_interest = sum(
        (l.outstanding_interest for l in all_loans if l.loan_status not in ["FULLY_PAID", "ROLLED_OVER", "CANCELLED", "WRITTEN_OFF"]),
        Decimal("0.00")
    )

    all_payments = db.query(Payment).filter(Payment.reversal_status == "ACTIVE").all()
    total_repayments = sum((p.amount_received for p in all_payments), Decimal("0.00"))

    cash_summary = get_cashbook_summary(db)

    # Recent activities
    recent_logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(8).all()
    recent_activities = [
        {
            "id": log.id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "user_name": log.user_name,
            "details": log.details,
            "created_at": log.created_at.strftime("%Y-%m-%d %H:%M:%S") if log.created_at else ""
        }
        for log in recent_logs
    ]

    def build_loan_response(l: Loan) -> LoanResponse:
        days_over = max(0, (today - l.maturity_date).days) if today > l.maturity_date else 0
        return LoanResponse(
            id=l.id,
            loan_reference=l.loan_reference,
            client_id=l.client_id,
            client_name=l.client.full_name if l.client else "Client",
            client_number=l.client.client_number if l.client else "",
            parent_loan_id=l.parent_loan_id,
            principal_amount=l.principal_amount,
            interest_rate=l.interest_rate,
            interest_amount=l.interest_amount,
            scheduled_total=l.scheduled_total,
            loan_duration_days=l.loan_duration_days,
            disbursement_date=l.disbursement_date,
            maturity_date=l.maturity_date,
            outstanding_principal=l.outstanding_principal,
            outstanding_interest=l.outstanding_interest,
            loan_status=l.loan_status,
            rollover_status=l.rollover_status,
            disbursement_method=l.disbursement_method,
            book_number=l.book_number,
            page_number=l.page_number,
            notes=l.notes,
            days_overdue=days_over,
            created_at=l.created_at
        )

    due_today_resp = [build_loan_response(l) for l in due_today_loans[:5]]
    urgent_overdue_resp = [build_loan_response(l) for l in sorted(overdue_loans, key=lambda x: x.maturity_date)[:5]]

    return DashboardSummaryResponse(
        total_clients=total_clients,
        active_loans_count=len(active_loans),
        matured_loans_count=len(matured_loans),
        overdue_loans_count=len(overdue_loans),
        loans_due_today_count=len(due_today_loans),
        loans_awaiting_rollover_count=len(awaiting_rollover),
        total_principal_disbursed=quantize_money(total_disbursed),
        total_outstanding_principal=quantize_money(out_principal),
        total_outstanding_interest=quantize_money(out_interest),
        total_repayments_received=quantize_money(total_repayments),
        available_capital=cash_summary.available_cash,
        recent_activities=recent_activities,
        due_today_loans=due_today_resp,
        urgent_overdue_loans=urgent_overdue_resp
    )

def get_loan_aging_report(db: Session) -> Dict[str, Any]:
    today = datetime.date.today()
    overdue_loans = (
        db.query(Loan)
        .filter(
            Loan.maturity_date < today,
            Loan.loan_status.in_(["ACTIVE", "PARTIALLY_PAID", "MATURED", "AWAITING_ROLLOVER"]),
            (Loan.outstanding_principal + Loan.outstanding_interest) > 0
        )
        .all()
    )

    bucket_1_30 = []
    bucket_31_60 = []
    bucket_61_90 = []
    bucket_90_plus = []

    for l in overdue_loans:
        days = (today - l.maturity_date).days
        item = {
            "loan_id": l.id,
            "loan_reference": l.loan_reference,
            "client_name": l.client.full_name if l.client else "Client",
            "client_phone": l.client.primary_phone if l.client else "",
            "disbursement_date": str(l.disbursement_date),
            "maturity_date": str(l.maturity_date),
            "days_overdue": days,
            "outstanding_principal": float(l.outstanding_principal),
            "outstanding_interest": float(l.outstanding_interest),
            "total_due": float(l.outstanding_principal + l.outstanding_interest),
            "book_page": f"Book {l.book_number or '-'} / Page {l.page_number or '-'}"
        }
        if 1 <= days <= 30:
            bucket_1_30.append(item)
        elif 31 <= days <= 60:
            bucket_31_60.append(item)
        elif 61 <= days <= 90:
            bucket_61_90.append(item)
        else:
            bucket_90_plus.append(item)

    return {
        "summary": {
            "bucket_1_30_count": len(bucket_1_30),
            "bucket_1_30_amount": sum(i["total_due"] for i in bucket_1_30),
            "bucket_31_60_count": len(bucket_31_60),
            "bucket_31_60_amount": sum(i["total_due"] for i in bucket_31_60),
            "bucket_61_90_count": len(bucket_61_90),
            "bucket_61_90_amount": sum(i["total_due"] for i in bucket_61_90),
            "bucket_90_plus_count": len(bucket_90_plus),
            "bucket_90_plus_amount": sum(i["total_due"] for i in bucket_90_plus),
        },
        "bucket_1_30": bucket_1_30,
        "bucket_31_60": bucket_31_60,
        "bucket_61_90": bucket_61_90,
        "bucket_90_plus": bucket_90_plus
    }

def get_collections_report(
    db: Session,
    start_date: Optional[datetime.date] = None,
    end_date: Optional[datetime.date] = None,
    payment_method: Optional[str] = None
) -> Dict[str, Any]:
    query = db.query(Payment).filter(Payment.reversal_status == "ACTIVE")
    if start_date:
        query = query.filter(Payment.payment_date >= start_date)
    if end_date:
        query = query.filter(Payment.payment_date <= end_date)
    if payment_method and payment_method != "ALL":
        query = query.filter(Payment.payment_method == payment_method)

    payments = query.order_by(Payment.payment_date.desc()).all()

    total_collected = Decimal("0.00")
    total_interest_recovered = Decimal("0.00")
    total_principal_recovered = Decimal("0.00")
    by_method = {}

    payment_rows = []
    for p in payments:
        total_collected += p.amount_received
        m = p.payment_method or "Other"
        by_method[m] = by_method.get(m, Decimal("0.00")) + p.amount_received

        interest_alloc = sum((a.amount_allocated for a in p.allocations if a.allocation_type == "INTEREST"), Decimal("0.00"))
        principal_alloc = sum((a.amount_allocated for a in p.allocations if a.allocation_type == "PRINCIPAL"), Decimal("0.00"))
        total_interest_recovered += interest_alloc
        total_principal_recovered += principal_alloc

        client = db.query(Client).filter(Client.id == p.client_id).first()
        loan = db.query(Loan).filter(Loan.id == p.loan_id).first()

        payment_rows.append({
            "payment_reference": p.payment_reference,
            "payment_date": str(p.payment_date),
            "client_name": client.full_name if client else "Client",
            "loan_reference": loan.loan_reference if loan else "Loan",
            "amount": float(p.amount_received),
            "payment_method": p.payment_method,
            "external_reference": p.external_transaction_reference,
            "interest_portion": float(interest_alloc),
            "principal_portion": float(principal_alloc)
        })

    return {
        "total_collected": float(total_collected),
        "total_interest_recovered": float(total_interest_recovered),
        "total_principal_recovered": float(total_principal_recovered),
        "by_method": {k: float(v) for k, v in by_method.items()},
        "payments": payment_rows
    }

