from fastapi import APIRouter, Depends

from ..core.errors import ForbiddenError
from ..models import User
from ..schemas import DemoResetOut
from ..services import AuthService
from ..services.demo_service import DemoService
from .deps import get_auth_service, get_current_user, get_demo_service

router = APIRouter(prefix="/api/demo", tags=["demo"])


@router.post("/reset", response_model=DemoResetOut)
def reset_demo_data(
    current_user: User = Depends(get_current_user),
    auth: AuthService = Depends(get_auth_service),
    demo: DemoService = Depends(get_demo_service),
):
    """Wipe all zones and reload the sample data. Only the demo user may do this, never the admin account."""
    if not auth.is_demo_user(current_user):
        raise ForbiddenError("Only the demo account can reset the sample data.")
    zones, records = demo.reset()
    return DemoResetOut(zones=zones, records=records)
