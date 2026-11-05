import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Loan Management System"
    CURRENCY: str = "KES"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-keith-lms-2026-super-secure")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/lms.db")
    DEFAULT_LOAN_DURATION_DAYS: int = 30
    DEFAULT_INTEREST_RATE_PERCENT: float = 20.0
    TIMEZONE: str = "Africa/Nairobi"

    class Config:
        env_file = ".env"

settings = Settings()

