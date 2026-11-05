import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import (
    auth_router, client_router, guarantor_router, loan_router,
    payment_router, rollover_router, cashbook_router,
    book_reference_router, note_router, report_router,
    setting_router, audit_router
)
from seed import seed_database

# Create data directory if not exists
os.makedirs("data", exist_ok=True)

# Create tables and seed default data
Base.metadata.create_all(bind=engine)
seed_database()

app = FastAPI(
    title="Loan Management System API",
    description="Backend API for Keith Capital Loan Management System (KES, 30-day, 20% interest, ledger-based)",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development allow all; can be configured in settings
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers
app.include_router(auth_router.router)
app.include_router(client_router.router)
app.include_router(guarantor_router.router)
app.include_router(loan_router.router)
app.include_router(payment_router.router)
app.include_router(rollover_router.router)
app.include_router(cashbook_router.router)
app.include_router(book_reference_router.router)
app.include_router(note_router.router)
app.include_router(report_router.router)
app.include_router(setting_router.router)
app.include_router(audit_router.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": "Loan Management System",
        "currency": "KES",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

