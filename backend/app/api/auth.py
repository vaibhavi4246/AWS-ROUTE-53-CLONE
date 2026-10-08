from fastapi import APIRouter, Depends, Response

from ..core.config import Settings, get_settings
from ..models import User
from ..schemas import DemoLoginOut, UserLogin, UserOut
from ..services import AuthService
from ..services.demo_service import DemoService
from .deps import get_auth_service, get_current_user, get_demo_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _cookie_options(settings: Settings) -> dict:
    cross_site = settings.cross_site_cookies
    return {"httponly": True, "samesite": "none" if cross_site else "lax", "secure": cross_site}


def user_out(user: User, auth: AuthService) -> UserOut:
    out = UserOut.model_validate(user)
    out.is_demo = auth.is_demo_user(user)
    return out


@router.post("/login")
def login(
    credentials: UserLogin,
    response: Response,
    auth: AuthService = Depends(get_auth_service),
    settings: Settings = Depends(get_settings),
):
    user = auth.authenticate(credentials.username, credentials.password)
    token = auth.issue_token(user)
    response.set_cookie("session", token, max_age=settings.token_ttl_seconds, **_cookie_options(settings))
    return {"token": token, "user": user_out(user, auth)}


@router.post("/demo", response_model=DemoLoginOut)
def demo_login(
    response: Response,
    auth: AuthService = Depends(get_auth_service),
    demo: DemoService = Depends(get_demo_service),
    settings: Settings = Depends(get_settings),
):
    """One-click sign-in to the demo account; loads the sample zones the first time (when none exist)."""
    user = auth.authenticate_demo()
    seeded = demo.seed_if_empty()
    token = auth.issue_token(user)
    response.set_cookie("session", token, max_age=settings.token_ttl_seconds, **_cookie_options(settings))
    return DemoLoginOut(token=token, user=user_out(user, auth), seeded=seeded)


@router.post("/logout")
def logout(response: Response, settings: Settings = Depends(get_settings)):
    response.delete_cookie("session", **_cookie_options(settings))
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user), auth: AuthService = Depends(get_auth_service)):
    return user_out(current_user, auth)
