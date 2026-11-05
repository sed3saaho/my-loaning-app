import datetime
from decimal import Decimal
from sqlalchemy import (
    Column, Integer, String, Numeric, Date, DateTime, Boolean, ForeignKey, Text
)
from sqlalchemy.orm import relationship as sa_relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=True)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="admin", nullable=False)
    mfa_enabled = Column(Boolean, default=False)
    pin_code = Column(String(10), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class BusinessSettings(Base):
    __tablename__ = "business_settings"

    id = Column(Integer, primary_key=True)
    business_name = Column(String(100), default="Keith Capital Lending")
    currency = Column(String(10), default="KES")
    default_duration_days = Column(Integer, default=30)
    default_interest_rate = Column(Numeric(5, 2), default=Decimal("20.00")) # 20%
    rollover_mode = Column(String(20), default="MANUAL") # MANUAL or AUTOMATIC
    require_mfa = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    client_number = Column(String(30), unique=True, index=True, nullable=False)
    full_name = Column(String(100), index=True, nullable=False)
    identification_type = Column(String(30), default="National ID") # National ID, Passport, Military ID
    identification_number = Column(String(50), index=True, nullable=True)
    year_of_birth = Column(Integer, nullable=True)
    primary_phone = Column(String(30), index=True, nullable=False)
    alternative_phone = Column(String(30), nullable=True)
    county = Column(String(50), nullable=True)
    town = Column(String(50), nullable=True)
    physical_address = Column(String(200), nullable=True)
    profile_photo_path = Column(String(255), nullable=True)
    registration_date = Column(Date, default=datetime.date.today, nullable=False)
    client_status = Column(String(20), default="ACTIVE") # ACTIVE, INACTIVE, BLACKLISTED
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    loans = sa_relationship("Loan", back_populates="client", cascade="all, delete-orphan")
    guarantor_links = sa_relationship("ClientGuarantor", back_populates="client", cascade="all, delete-orphan")
    book_references = sa_relationship("LoanBookReference", back_populates="client")
    follow_up_notes = sa_relationship("FollowUpNote", back_populates="client")

class Guarantor(Base):
    __tablename__ = "guarantors"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    identification_type = Column(String(30), default="National ID")
    identification_number = Column(String(50), index=True, nullable=True)
    phone_number = Column(String(30), nullable=False)
    alternative_phone = Column(String(30), nullable=True)
    residential_address = Column(String(200), nullable=True)
    relationship_type = Column(String(50), nullable=True) # e.g. Spouse, Brother, Colleague, Friend
    consent_status = Column(String(30), default="CONFIRMED") # CONFIRMED, PENDING, WITHDRAWN
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    @property
    def relationship(self):
        return self.relationship_type

    # Relationships
    client_links = sa_relationship("ClientGuarantor", back_populates="guarantor")

class ClientGuarantor(Base):
    __tablename__ = "client_guarantors"

    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    guarantor_id = Column(Integer, ForeignKey("guarantors.id", ondelete="CASCADE"), nullable=False)
    relationship_type = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    client = sa_relationship("Client", back_populates="guarantor_links")
    guarantor = sa_relationship("Guarantor", back_populates="client_links")

class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    loan_reference = Column(String(30), unique=True, index=True, nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False)
    parent_loan_id = Column(Integer, ForeignKey("loans.id", ondelete="SET NULL"), nullable=True) # Previous cycle if rolled over

    principal_amount = Column(Numeric(14, 2), nullable=False)
    interest_rate = Column(Numeric(5, 2), default=Decimal("20.00"), nullable=False) # e.g. 20.00
    interest_amount = Column(Numeric(14, 2), nullable=False)
    scheduled_total = Column(Numeric(14, 2), nullable=False) # principal + interest
    loan_duration_days = Column(Integer, default=30, nullable=False)

    disbursement_date = Column(Date, nullable=False)
    maturity_date = Column(Date, nullable=False)

    outstanding_principal = Column(Numeric(14, 2), nullable=False)
    outstanding_interest = Column(Numeric(14, 2), nullable=False)

    # Status: ACTIVE, PARTIALLY_PAID, MATURED, AWAITING_ROLLOVER, ROLLED_OVER, FULLY_PAID, CANCELLED, WRITTEN_OFF
    loan_status = Column(String(30), default="ACTIVE", index=True, nullable=False)
    # Rollover Status: NOT_ELIGIBLE, PENDING, APPROVED, PROCESSED, REJECTED
    rollover_status = Column(String(30), default="NOT_ELIGIBLE", nullable=False)

    disbursement_method = Column(String(30), default="Cash") # Cash, M-Pesa, Bank Transfer, Other
    book_number = Column(String(50), nullable=True) # Handwritten book reference
    page_number = Column(String(50), nullable=True) # Handwritten page reference
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    client = sa_relationship("Client", back_populates="loans")
    payments = sa_relationship("Payment", back_populates="loan", cascade="all, delete-orphan")
    allocations = sa_relationship("PaymentAllocation", back_populates="loan")
    parent_loan = sa_relationship("Loan", remote_side=[id], backref="child_cycles")
    book_references = sa_relationship("LoanBookReference", back_populates="loan")
    follow_up_notes = sa_relationship("FollowUpNote", back_populates="loan")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_reference = Column(String(30), unique=True, index=True, nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False)
    loan_id = Column(Integer, ForeignKey("loans.id", ondelete="RESTRICT"), nullable=False)

    amount_received = Column(Numeric(14, 2), nullable=False)
    payment_date = Column(Date, nullable=False)
    payment_method = Column(String(30), default="Cash") # Cash, M-Pesa, Bank Transfer, Other
    external_transaction_reference = Column(String(100), index=True, nullable=True) # e.g. M-Pesa receipt code
    recorded_by = Column(String(50), default="Admin")
    notes = Column(Text, nullable=True)

    # Reversal tracking
    reversal_status = Column(String(20), default="ACTIVE") # ACTIVE or REVERSED
    reversal_reason = Column(Text, nullable=True)
    reversed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    loan = sa_relationship("Loan", back_populates="payments")
    allocations = sa_relationship("PaymentAllocation", back_populates="payment", cascade="all, delete-orphan")

class PaymentAllocation(Base):
    __tablename__ = "payment_allocations"

    id = Column(Integer, primary_key=True)
    payment_id = Column(Integer, ForeignKey("payments.id", ondelete="CASCADE"), nullable=False)
    loan_id = Column(Integer, ForeignKey("loans.id", ondelete="CASCADE"), nullable=False)
    allocation_type = Column(String(20), nullable=False) # INTEREST or PRINCIPAL
    amount_allocated = Column(Numeric(14, 2), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    payment = sa_relationship("Payment", back_populates="allocations")
    loan = sa_relationship("Loan", back_populates="allocations")

class LoanBookReference(Base):
    __tablename__ = "loan_book_references"

    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    loan_id = Column(Integer, ForeignKey("loans.id", ondelete="SET NULL"), nullable=True)
    book_number = Column(String(50), nullable=False)
    page_number = Column(String(50), nullable=False)
    date_recorded = Column(Date, default=datetime.date.today)
    scanned_document_path = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    client = sa_relationship("Client", back_populates="book_references")
    loan = sa_relationship("Loan", back_populates="book_references")

class FollowUpNote(Base):
    __tablename__ = "follow_up_notes"

    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    loan_id = Column(Integer, ForeignKey("loans.id", ondelete="SET NULL"), nullable=True)
    note_type = Column(String(50), default="Call") # Call, Office Visit, Promise to Pay, Demand Notice, Other
    description = Column(Text, nullable=False)
    next_action_date = Column(Date, nullable=True)
    recorded_by = Column(String(50), default="Admin")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    client = sa_relationship("Client", back_populates="follow_up_notes")
    loan = sa_relationship("Loan", back_populates="follow_up_notes")

class CashbookEntry(Base):
    __tablename__ = "cashbook_entries"

    id = Column(Integer, primary_key=True, index=True)
    # Entry types: CAPITAL_IN, LOAN_REPAYMENT, OTHER_INCOME, LOAN_DISBURSEMENT, EXPENSE, CAPITAL_WITHDRAWAL
    entry_type = Column(String(30), nullable=False)
    category = Column(String(50), nullable=True)
    amount = Column(Numeric(14, 2), nullable=False)
    entry_date = Column(Date, default=datetime.date.today, nullable=False)
    reference_id = Column(String(50), nullable=True) # Linked loan ref or payment ref
    reference_type = Column(String(30), nullable=True) # LOAN, PAYMENT, MANUAL
    description = Column(Text, nullable=False)
    recorded_by = Column(String(50), default="Admin")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(50), nullable=False) # e.g. CLIENT_CREATED, LOAN_DISBURSED, PAYMENT_RECORDED, PAYMENT_REVERSED, ROLLOVER_APPROVED
    entity_type = Column(String(50), nullable=False) # e.g. Client, Loan, Payment, Settings
    entity_id = Column(String(50), nullable=True)
    user_name = Column(String(50), default="Admin")
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    title = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(30), default="INFO") # MATURITY_ALERT, OVERDUE_ALERT, ROLLOVER_PROPOSAL, SYSTEM
    is_read = Column(Boolean, default=False)
    loan_id = Column(Integer, nullable=True)
    client_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
