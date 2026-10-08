from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from .core.config import get_settings

engine = create_engine(get_settings().database_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema() -> None:
    """Create tables and apply small additive migrations to older databases."""
    from . import models  # noqa: F401  (registers tables on Base.metadata)

    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        zone_columns = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(hosted_zones)")}
        if "created_by" not in zone_columns:
            conn.exec_driver_sql("ALTER TABLE hosted_zones ADD COLUMN created_by VARCHAR DEFAULT 'Route 53'")
        conn.exec_driver_sql(
            "CREATE INDEX IF NOT EXISTS ix_dns_records_zone_name_type "
            "ON dns_records (hosted_zone_id, name, type)"
        )
