import secrets

from ..core import security
from ..core.config import Settings
from ..core.errors import AuthenticationError, NotFoundError
from ..models import User
from ..repositories.interfaces import UserRepository


class AuthService:
    """Mock authentication: one seeded account, signed expiring tokens."""

    def __init__(self, users: UserRepository, settings: Settings):
        self._users = users
        self._settings = settings

    def authenticate(self, username: str, password: str) -> User:
        user = self._users.get_by_username(username)
        if user is None or not security.verify_password(password, user.password_hash):
            raise AuthenticationError("Incorrect username or password")
        if security.is_legacy_hash(user.password_hash):
            user.password_hash = security.hash_password(password)
            self._users.save(user)
        return user

    def is_demo_user(self, user: User) -> bool:
        return self._settings.demo_enabled and user.username == self._settings.demo_username

    def authenticate_demo(self) -> User:
        """Sign in as the demo user, creating it on first use.

        The demo account has no usable password (its stored hash is of a random secret), so it can only be
        reached through this one-click path, and only while DEMO_MODE is on.
        """
        if not self._settings.demo_enabled:
            raise NotFoundError("Demo mode is disabled")
        user = self._users.get_by_username(self._settings.demo_username)
        if user is None:
            user = self._users.add(
                User(
                    username=self._settings.demo_username,
                    password_hash=security.hash_password(secrets.token_urlsafe(32)),
                    aws_account_id=self._settings.default_account_id,
                )
            )
        return user

    def issue_token(self, user: User) -> str:
        return security.create_token(user.username, self._settings.secret_key, self._settings.token_ttl_seconds)

    def user_from_token(self, token: str) -> User:
        username = security.verify_token(token, self._settings.secret_key)
        if username is None:
            raise AuthenticationError("Session token is invalid or expired.")
        user = self._users.get_by_username(username)
        if user is None:
            raise AuthenticationError("User not found.")
        return user

    def ensure_default_user(self) -> None:
        if self._users.get_by_username(self._settings.default_admin_username) is None:
            self._users.add(
                User(
                    username=self._settings.default_admin_username,
                    password_hash=security.hash_password(self._settings.default_admin_password),
                    aws_account_id=self._settings.default_account_id,
                )
            )
