import datetime
from decimal import Decimal
from app.database import engine, SessionLocal, Base
from app.models import User, BusinessSettings, Client, Guarantor, ClientGuarantor, Loan, CashbookEntry, LoanBookReference
from app.auth import get_password_hash
from app.services.loan_service import create_loan
from app.services.payment_service import record_payment
from app.schemas import LoanCreate, PaymentCreate

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 1. Admin user
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        admin = User(
            username="admin",
            full_name="Business Administrator",
            email="admin@keithlending.co.ke",
            hashed_password=get_password_hash("admin123"),
            role="admin",
            pin_code="1234",
            is_active=True
        )
        db.add(admin)
        print("Created default admin user: admin / admin123")

    # 2. Business Settings
    settings = db.query(BusinessSettings).first()
    if not settings:
        settings = BusinessSettings(
            business_name="Keith Capital Lending",
            currency="KES",
            default_duration_days=30,
            default_interest_rate=Decimal("20.00"),
            rollover_mode="MANUAL",
            require_mfa=False
        )
        db.add(settings)
        print("Created business settings (KES, 30 days, 20% flat interest)")

    # 3. Capital Injection in Cashbook
    capital_entry = db.query(CashbookEntry).filter(CashbookEntry.entry_type == "CAPITAL_IN").first()
    if not capital_entry:
        cap = CashbookEntry(
            entry_type="CAPITAL_IN",
            category="Owner Capital",
            amount=Decimal("500000.00"), # KES 500,000 opening capital
            entry_date=datetime.date.today() - datetime.timedelta(days=45),
            reference_type="MANUAL",
            description="Initial Owner Capital Injection for Lending Operations",
            recorded_by="Admin"
        )
        db.add(cap)

    db.commit()

    # 4. Sample Clients & Guarantors if database is empty
    client_count = db.query(Client).count()
    if client_count == 0:
        # Guarantor 1
        g1 = Guarantor(
            full_name="Joseph Mwangi Karanja",
            identification_type="National ID",
            identification_number="28491023",
            phone_number="0722334455",
            residential_address="Pangani, Nairobi",
            relationship_type="Brother",
            consent_status="CONFIRMED",
            notes="Guarantor with verified business stall at Gikomba"
        )
        # Guarantor 2
        g2 = Guarantor(
            full_name="Grace Wambui Njoroge",
            identification_type="National ID",
            identification_number="30192847",
            phone_number="0711998877",
            residential_address="Kasarani, Nairobi",
            relationship_type="Business Partner",
            consent_status="CONFIRMED",
            notes="Guarantor for retail shop inventory loans"
        )
        db.add_all([g1, g2])
        db.commit()

        # Client 1: SRS Scenario Client (Wanjiku Kamau)
        c1 = Client(
            client_number="CL-2026-0001",
            full_name="Wanjiku Kamau",
            identification_type="National ID",
            identification_number="29182736",
            year_of_birth=1988,
            primary_phone="0712345678",
            county="Nairobi",
            town="Eastleigh",
            physical_address="Flat 4B, 3rd Avenue",
            registration_date=datetime.date.today() - datetime.timedelta(days=35),
            client_status="ACTIVE",
            notes="Hardware shop owner in Eastleigh. Long-standing client."
        )
        db.add(c1)
        db.flush()

        # Link Guarantor
        db.add(ClientGuarantor(client_id=c1.id, guarantor_id=g1.id, relationship_type="Brother"))

        # Physical Book reference
        db.add(LoanBookReference(
            client_id=c1.id,
            book_number="Book 01",
            page_number="Page 42",
            date_recorded=datetime.date.today() - datetime.timedelta(days=35),
            notes="Handwritten entry in physical ledger 2026"
        ))

        # Client 2: Dennis Kiprop (Active loan)
        c2 = Client(
            client_number="CL-2026-0002",
            full_name="Dennis Kiprop Cheruiyot",
            identification_type="National ID",
            identification_number="31920184",
            year_of_birth=1992,
            primary_phone="0720556677",
            county="Kiambu",
            town="Thika",
            physical_address="Section 9, House 12",
            registration_date=datetime.date.today() - datetime.timedelta(days=15),
            client_status="ACTIVE",
            notes="Produce distributor across Nairobi & Thika."
        )
        db.add(c2)
        db.flush()
        db.add(ClientGuarantor(client_id=c2.id, guarantor_id=g2.id, relationship_type="Business Partner"))

        # Client 3: Fatuma Abdi (Overdue loan)
        c3 = Client(
            client_number="CL-2026-0003",
            full_name="Fatuma Abdi Hassan",
            identification_type="National ID",
            identification_number="27483920",
            year_of_birth=1985,
            primary_phone="0733887766",
            county="Nairobi",
            town="South C",
            physical_address="Mugoya Estate, House 88",
            registration_date=datetime.date.today() - datetime.timedelta(days=40),
            client_status="ACTIVE",
            notes="Textile importer."
        )
        db.add(c3)
        db.commit()

        # Seed SRS Loan Scenario for Wanjiku Kamau:
        # Principal: 10,000, Interest: 2,000 (20%), Disbursed 35 days ago (matured 5 days ago)
        # Payments made: 1,000, 2,000, 3,000, 2,000 (Total 8,000)
        # Interest paid = 2,000, Principal paid = 6,000. Outstanding: Int 0, Princ 4,000.
        loan1 = create_loan(
            db,
            LoanCreate(
                client_id=c1.id,
                principal_amount=Decimal("10000.00"),
                interest_rate=Decimal("20.00"),
                loan_duration_days=30,
                disbursement_date=datetime.date.today() - datetime.timedelta(days=35),
                disbursement_method="M-Pesa",
                book_number="Book 01",
                page_number="Page 42",
                notes="SRS Acceptance Test Loan: KES 10,000 @ 20%"
            ),
            user_name="Admin"
        )

        # 4 Payments matching SRS Section 25.2:
        payments_spec = [
            (Decimal("1000.00"), datetime.date.today() - datetime.timedelta(days=25), "Cash", None),
            (Decimal("2000.00"), datetime.date.today() - datetime.timedelta(days=20), "M-Pesa", "QHX129AK4M"),
            (Decimal("3000.00"), datetime.date.today() - datetime.timedelta(days=10), "M-Pesa", "QHX883B10P"),
            (Decimal("2000.00"), datetime.date.today() - datetime.timedelta(days=2), "Cash", None),
        ]
        for amt, p_date, method, ref in payments_spec:
            record_payment(
                db,
                PaymentCreate(
                    loan_id=loan1.id,
                    amount_received=amt,
                    payment_date=p_date,
                    payment_method=method,
                    external_transaction_reference=ref,
                    notes=f"SRS installment payment of KES {amt:,.2f}"
                ),
                user_name="Admin"
            )

        # Loan 2 for Dennis Kiprop: Active loan
        create_loan(
            db,
            LoanCreate(
                client_id=c2.id,
                principal_amount=Decimal("25000.00"),
                interest_rate=Decimal("20.00"),
                loan_duration_days=30,
                disbursement_date=datetime.date.today() - datetime.timedelta(days=10),
                disbursement_method="M-Pesa",
                book_number="Book 01",
                page_number="Page 55",
                notes="Stock restocking loan"
            ),
            user_name="Admin"
        )

        # Loan 3 for Fatuma Abdi: Overdue loan
        create_loan(
            db,
            LoanCreate(
                client_id=c3.id,
                principal_amount=Decimal("50000.00"),
                interest_rate=Decimal("20.00"),
                loan_duration_days=30,
                disbursement_date=datetime.date.today() - datetime.timedelta(days=42),
                disbursement_method="Bank Transfer",
                book_number="Book 01",
                page_number="Page 38",
                notes="Overdue cycle awaiting rollover or recovery"
            ),
            user_name="Admin"
        )

        print("Seeded sample clients, guarantors, and SRS test scenarios.")

    db.close()

if __name__ == "__main__":
    seed_database()
