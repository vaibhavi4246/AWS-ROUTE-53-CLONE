"""FastAPI dependency wiring: the only place concrete classes are assembled."""
from typing import Optional

from fastapi import Cookie, Depends, Header
from sqlalchemy.orm import Session

from ..core.config import Settings, get_settings
from ..core.errors import AuthenticationError
from ..database import get_db
from ..formats import default_formats
from ..models import User
from ..repositories import (
    SqlAlchemyRecordRepository,
    SqlAlchemyUserRepository,
    SqlAlchemyZoneRepository,
)
from ..services import AuthService, RecordService, TransferService, ZoneService
from ..services.demo_service import DemoService
from ..validators import default_registry


def get_auth_service(db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> AuthService:
    return AuthService(SqlAlchemyUserRepository(db), settings)


def get_zone_service(db: Session = Depends(get_db)) -> ZoneService:
    return ZoneService(SqlAlchemyZoneRepository(db))


def get_record_service(db: Session = Depends(get_db)) -> RecordService:
    return RecordService(SqlAlchemyZoneRepository(db), SqlAlchemyRecordRepository(db), default_registry)


def get_demo_service(db: Session = Depends(get_db)) -> DemoService:
    zones, records = SqlAlchemyZoneRepository(db), SqlAlchemyRecordRepository(db)
    return DemoService(zones, ZoneService(zones), RecordService(zones, records, default_registry))


def get_transfer_service(db: Session = Depends(get_db)) -> TransferService:
    zones, records = SqlAlchemyZoneRepository(db), SqlAlchemyRecordRepository(db)
    return TransferService(zones, records, RecordService(zones, records, default_registry), default_formats())


def get_current_user(
    authorization: Optional[str] = Header(None),
    session: Optional[str] = Cookie(None),
    auth: AuthService = Depends(get_auth_service),
) -> User:
    token = authorization[7:] if authorization and authorization.startswith("Bearer ") else session
    if not token:
        raise AuthenticationError("Authentication credentials were not provided.")
    return auth.user_from_token(token)
