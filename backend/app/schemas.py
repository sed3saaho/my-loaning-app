from decimal import Decimal
from typing import Optional, List, Any
from datetime import date, datetime
from pydantic import BaseModel, Field

# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserResponse"

class TokenData(BaseModel):
    username: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str
    pin: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    full_name: str
    email: Optional[str] = None
    password: str
    role: str = "admin"
    pin_code: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    email: Optional[str] = None
    role: str
    mfa_enabled: bool
    is_active: bool

    class Config:
        from_attributes = True

# --- Settings Schemas ---
class BusinessSettingsSchema(BaseModel):
    id: int
    business_name: str
    currency: str
    default_duration_days: int
    default_interest_rate: Decimal
    rollover_mode: str
    require_mfa: bool

    class Config:
        from_attributes = True

class BusinessSettingsUpdate(BaseModel):
    business_name: Optional[str] = None
    currency: Optional[str] = None
    default_duration_days: Optional[int] = None
    default_interest_rate: Optional[Decimal] = None
    rollover_mode: Optional[str] = None
    require_mfa: Optional[bool] = None

# --- Guarantor Schemas ---
class GuarantorCreate(BaseModel):
    full_name: str
    identification_type: str = "National ID"
    identification_number: Optional[str] = None
    phone_number: str
    alternative_phone: Optional[str] = None
    residential_address: Optional[str] = None
    relationship: Optional[str] = None
    consent_status: str = "CONFIRMED"
    notes: Optional[str] = None

class GuarantorUpdate(BaseModel):
    full_name: Optional[str] = None
    identification_type: Optional[str] = None
    identification_number: Optional[str] = None
    phone_number: Optional[str] = None
    alternative_phone: Optional[str] = None
    residential_address: Optional[str] = None
    relationship: Optional[str] = None
    consent_status: Optional[str] = None
    notes: Optional[str] = None

class GuarantorResponse(BaseModel):
    id: int
    full_name: str
    identification_type: str
    identification_number: Optional[str] = None
    phone_number: str
    alternative_phone: Optional[str] = None
    residential_address: Optional[str] = None
    relationship: Optional[str] = None
    consent_status: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Client Schemas ---
class ClientCreate(BaseModel):
    full_name: str
    identification_type: str = "National ID"
    identification_number: Optional[str] = None
    year_of_birth: Optional[int] = None
    primary_phone: str
    alternative_phone: Optional[str] = None
    county: Optional[str] = None
    town: Optional[str] = None
    physical_address: Optional[str] = None
    registration_date: Optional[date] = None
    notes: Optional[str] = None
    guarantor_ids: Optional[List[int]] = []
    # Physical book opening reference if digitising
    initial_book_number: Optional[str] = None
    initial_page_number: Optional[str] = None

class ClientUpdate(BaseModel):
    full_name: Optional[str] = None
    identification_type: Optional[str] = None
    identification_number: Optional[str] = None
    year_of_birth: Optional[int] = None
    primary_phone: Optional[str] = None
    alternative_phone: Optional[str] = None
    county: Optional[str] = None
    town: Optional[str] = None
    physical_address: Optional[str] = None
    client_status: Optional[str] = None
    notes: Optional[str] = None

class ClientResponse(BaseModel):
    id: int
    client_number: str
    full_name: str
    identification_type: str
    identification_number: Optional[str] = None
    year_of_birth: Optional[int] = None
    primary_phone: str
    alternative_phone: Optional[str] = None
    county: Optional[str] = None
    town: Optional[str] = None
    physical_address: Optional[str] = None
    registration_date: date
    client_status: str
    notes: Optional[str] = None
    created_at: datetime
    # Aggregated metrics for quick overview
    active_loans_count: int = 0
    total_outstanding_principal: Decimal = Decimal("0.00")
    total_outstanding_interest: Decimal = Decimal("0.00")

    class Config:
        from_attributes = True

class DuplicateCheckResponse(BaseModel):
    has_duplicates: bool
    matching_clients: List[ClientResponse]

# --- Loan Schemas ---
class LoanCalculationPreview(BaseModel):
    principal_amount: Decimal
    interest_rate: Decimal
    interest_amount: Decimal
    scheduled_total: Decimal
    disbursement_date: date
    maturity_date: date

class LoanCreate(BaseModel):
    client_id: int
    principal_amount: Decimal = Field(..., gt=0)
    interest_rate: Optional[Decimal] = None # Defaults to business setting (20%)
    loan_duration_days: Optional[int] = None # Defaults to business setting (30)
    disbursement_date: date
    disbursement_method: str = "Cash"
    book_number: Optional[str] = None
    page_number: Optional[str] = None
    notes: Optional[str] = None

class LoanResponse(BaseModel):
    id: int
    loan_reference: str
    client_id: int
    client_name: Optional[str] = None
    client_number: Optional[str] = None
    parent_loan_id: Optional[int] = None
    principal_amount: Decimal
    interest_rate: Decimal
    interest_amount: Decimal
    scheduled_total: Decimal
    loan_duration_days: int
    disbursement_date: date
    maturity_date: date
    outstanding_principal: Decimal
    outstanding_interest: Decimal
    loan_status: str
    rollover_status: str
    disbursement_method: str
    book_number: Optional[str] = None
    page_number: Optional[str] = None
    notes: Optional[str] = None
    days_overdue: int = 0
    created_at: datetime

    class Config:
        from_attributes = True

# --- Payment Schemas ---
class PaymentPreviewRequest(BaseModel):
    loan_id: int
    amount: Decimal

class PaymentPreviewResponse(BaseModel):
    loan_id: int
    amount: Decimal
    current_outstanding_interest: Decimal
    current_outstanding_principal: Decimal
    interest_allocation: Decimal
    principal_allocation: Decimal
    remaining_interest: Decimal
    remaining_principal: Decimal
    excess_credit: Decimal
    resulting_status: str

class PaymentCreate(BaseModel):
    loan_id: int
    amount_received: Decimal = Field(..., gt=0)
    payment_date: date
    payment_method: str = "Cash" # Cash, M-Pesa, Bank Transfer, Other
    external_transaction_reference: Optional[str] = None
    notes: Optional[str] = None

class PaymentAllocationResponse(BaseModel):
    id: int
    allocation_type: str
    amount_allocated: Decimal
    created_at: datetime

    class Config:
        from_attributes = True

class PaymentResponse(BaseModel):
    id: int
    payment_reference: str
    client_id: int
    client_name: Optional[str] = None
    loan_id: int
    loan_reference: Optional[str] = None
    amount_received: Decimal
    payment_date: date
    payment_method: str
    external_transaction_reference: Optional[str] = None
    recorded_by: str
    reversal_status: str
    reversal_reason: Optional[str] = None
    reversed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    allocations: List[PaymentAllocationResponse] = []

    class Config:
        from_attributes = True

class PaymentReversalRequest(BaseModel):
    reason: str = Field(..., min_length=3)

# --- Rollover Schemas ---
class RolloverProposal(BaseModel):
    previous_loan_id: int
    previous_loan_reference: str
    client_id: int
    client_name: str
    eligible_principal: Decimal
    unpaid_previous_interest: Decimal
    new_interest_rate: Decimal
    new_interest_amount: Decimal
    new_scheduled_total: Decimal
    proposed_disbursement_date: date
    proposed_maturity_date: date
    can_rollover: bool
    reason_if_not: Optional[str] = None

class RolloverExecuteRequest(BaseModel):
    loan_id: int
    rollover_date: Optional[date] = None
    notes: Optional[str] = None

# --- Book Reference & Notes ---
class LoanBookReferenceCreate(BaseModel):
    client_id: int
    loan_id: Optional[int] = None
    book_number: str
    page_number: str
    date_recorded: Optional[date] = None
    notes: Optional[str] = None

class LoanBookReferenceResponse(BaseModel):
    id: int
    client_id: int
    client_name: Optional[str] = None
    loan_id: Optional[int] = None
    loan_reference: Optional[str] = None
    book_number: str
    page_number: str
    date_recorded: date
    scanned_document_path: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class FollowUpNoteCreate(BaseModel):
    client_id: int
    loan_id: Optional[int] = None
    note_type: str = "Call"
    description: str
    next_action_date: Optional[date] = None

class FollowUpNoteResponse(BaseModel):
    id: int
    client_id: int
    loan_id: Optional[int] = None
    note_type: str
    description: str
    next_action_date: Optional[date] = None
    recorded_by: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Cashbook Schemas ---
class CashbookEntryCreate(BaseModel):
    entry_type: str # CAPITAL_IN, LOAN_REPAYMENT, OTHER_INCOME, LOAN_DISBURSEMENT, EXPENSE, CAPITAL_WITHDRAWAL
    category: Optional[str] = None
    amount: Decimal = Field(..., gt=0)
    entry_date: date
    description: str

class CashbookEntryResponse(BaseModel):
    id: int
    entry_type: str
    category: Optional[str] = None
    amount: Decimal
    entry_date: date
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    description: str
    recorded_by: str
    created_at: datetime

    class Config:
        from_attributes = True

class CashbookSummaryResponse(BaseModel):
    available_cash: Decimal
    total_capital_introduced: Decimal
    total_repayments_collected: Decimal
    total_other_income: Decimal
    total_loan_disbursements: Decimal
    total_expenses: Decimal
    total_capital_withdrawn: Decimal
    outstanding_principal: Decimal
    outstanding_interest: Decimal

# --- Dashboard & Reports ---
class DashboardSummaryResponse(BaseModel):
    total_clients: int
    active_loans_count: int
    matured_loans_count: int
    overdue_loans_count: int
    loans_due_today_count: int
    loans_awaiting_rollover_count: int
    total_principal_disbursed: Decimal
    total_outstanding_principal: Decimal
    total_outstanding_interest: Decimal
    total_repayments_received: Decimal
    available_capital: Decimal
    recent_activities: List[Any] = []
    due_today_loans: List[LoanResponse] = []
    urgent_overdue_loans: List[LoanResponse] = []

class AuditLogResponse(BaseModel):
    id: int
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    user_name: str
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    category: str
    is_read: bool
    loan_id: Optional[int] = None
    client_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

