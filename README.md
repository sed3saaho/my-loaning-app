# Loan Management System (LMS)
**Digital Lending Administration, Repayments, Rollovers & Financial Reporting**

Built according to the **Loan Management System Software Requirements Specification (SRS) v1.0**.

---

## 🚀 Quick Start

To launch both the **Python Backend** and **React Frontend** together, run:

```bash
./start.sh
```

- **Frontend Application**: [http://localhost:5173](http://localhost:5173)
- **Backend API Docs (Swagger / OpenAPI)**: [http://localhost:8001/docs](http://localhost:8001/docs)
- **Default Administrator Credentials**:
  - **Username**: `admin`
  - **Password**: `admin123`
  - **PIN Code (if MFA is enabled)**: `1234`

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: **React 18** (SPA) with **Vite**, **Tailwind CSS**, **Lucide Icons**, and **React Router DOM**.
- **Backend**: **Python 3.14** with **FastAPI**, **Pydantic v2**, and **SQLAlchemy 2.0 ORM**.
- **Database**: **SQLite** with Foreign Key constraints enabled, Write-Ahead Logging (`WAL`), and exact `Decimal(14, 2)` monetary handling (no floating-point rounding errors).
- **Security**: JWT authentication, bcrypt password hashing, and immutable action audit logs.

---

## 📋 Features Implemented (SRS Blueprint Compliance)

| Module | Description |
|---|---|
| **1. Client Management** | Auto-generates `CL-YYYY-0001` numbers, duplicate detection (National ID & phone), full borrower profile, loan history, guarantor links, and physical book opening references. |
| **2. Guarantor Management** | Registry of guarantors with national ID, phone, address, relationship (e.g., Brother, Business Partner), consent status, and multi-borrower linkages. |
| **3. Loan Creation & Calculations** | Auto-generates `LN-YYYY-0001` references, flat interest engine (`Principal × 20%`), scheduled total calculation, default 30-day maturity computation, and disbursement cash tracking. |
| **4. Repayment Management** | **Interest-first allocation engine**: every installment pays outstanding cycle interest first, with the remainder reducing principal. Separate tracking of interest and principal balances. |
| **5. Traceable Reversals** | Audited payment reversals with mandatory reason capture, atomic balance restoration, and cashbook expense adjustment. |
| **6. Loan Rollovers** | Matured accounts queue. Rolls **eligible remaining principal only** into a new linked 30-day cycle at 20% interest. Prior unpaid interest is kept separate in historical ledger and never silently capitalized. |
| **7. Handwritten Book Index** | Dedicated physical book & page archive (`Book 01`, `Page 42`) allowing digital records to reconcile with handwritten office books. |
| **8. Cashbook & Capital** | Real-time liquid cash calculation: `Available Cash = Capital In + Repayments + Other Income - Disbursements - Expenses - Withdrawals`. Separates available cash from loans in the field. |
| **9. Reports & Analytics** | Loan Aging schedule (1–30, 31–60, 61–90, 90+ days overdue), Collections breakdown by method (Cash, M-Pesa, Bank Transfer), print-ready statements, and CSV exports. |
| **10. Audit Logs & Alerts** | Immutable audit log of all financial transactions, disbursements, payments, and setting changes. Due today & overdue maturity alerts. |

---

## 🧪 Acceptance Test Scenarios (SRS Section 25)

The database comes pre-seeded with the exact SRS test scenario:

### Test Scenario 1: Repayment Allocation (SRS 25.2)
- **Borrower**: Wanjiku Kamau (`CL-2026-0001`)
- **Loan**: `LN-2026-0001`
- **Principal Disbursed**: `KES 10,000.00`
- **Cycle Interest (20%)**: `KES 2,000.00`
- **Total Scheduled**: `KES 12,000.00`
- **Installments Recorded**: `KES 1,000.00`, `KES 2,000.00`, `KES 3,000.00`, `KES 2,000.00` (Total `KES 8,000.00`)
- **Result**:
  - Interest Paid: `KES 2,000.00` (Cleared)
  - Principal Paid: `KES 6,000.00`
  - Outstanding Interest: `KES 0.00`
  - Outstanding Principal: `KES 4,000.00`

### Test Scenario 2: Rollover Calculation (SRS 25.3)
- **Eligible Principal for Rollover**: `KES 4,000.00`
- **New Cycle Interest (20%)**: `KES 800.00`
- **New Scheduled Total**: `KES 4,800.00`
- **Duration**: 30 Calendar Days
- Parent loan cycle is preserved in history and linked to the new cycle.

---

## ⚙️ Manual Server Execution

If you prefer running the servers in separate terminal tabs:

### Backend
```bash
cd backend
./.venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend
```bash
cd frontend
export PATH="../.node_runtime/bin:$PATH"
npm run dev
```
