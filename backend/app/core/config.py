import os
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True)
class Settings:
    """Runtime configuration, read once from the environment."""

    database_url: str
    secret_key: str
    token_ttl_seconds: int
    frontend_url: str
    default_admin_username: str
    default_admin_password: str
    default_account_id: str
    demo_enabled: bool
    demo_username: str

    @property
    def cross_site_cookies(self) -> bool:
        """True when the frontend is served from a non-local origin (e.g. Vercel)."""
        return "localhost" not in self.frontend_url and "127.0.0.1" not in self.frontend_url

    @property
    def allowed_origins(self) -> list[str]:
        origins = {"http://localhost:3000", "http://127.0.0.1:3000", self.frontend_url.rstrip("/")}
        return sorted(origins)


@lru_cache
def get_settings() -> Settings:
    return Settings(
        database_url=os.getenv("DATABASE_URL", "sqlite:///./route53.db"),
        secret_key=os.getenv("SECRET_KEY", "dev-only-secret-change-me"),
        token_ttl_seconds=int(os.getenv("TOKEN_TTL_SECONDS", "86400")),
        frontend_url=os.getenv("FRONTEND_URL", "http://localhost:3000"),
        default_admin_username=os.getenv("ADMIN_USERNAME", "admin"),
        default_admin_password=os.getenv("ADMIN_PASSWORD", "admin"),
        default_account_id=os.getenv("AWS_ACCOUNT_ID", "1234-5678-9012"),
        demo_enabled=os.getenv("DEMO_MODE", "true").strip().lower() not in ("0", "false", "no", "off"),
        demo_username=os.getenv("DEMO_USERNAME", "demo"),
    )
