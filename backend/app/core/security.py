import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Optional

_SCRYPT_PARAMS = {"n": 2**14, "r": 8, "p": 1, "dklen": 32}


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, **_SCRYPT_PARAMS)
    return f"scrypt${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    """Verify against a scrypt hash, or a legacy unsalted SHA-256 hash."""
    if stored.startswith("scrypt$"):
        try:
            _, salt_hex, digest_hex = stored.split("$")
            digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt_hex), **_SCRYPT_PARAMS)
        except ValueError:
            return False
        return hmac.compare_digest(digest.hex(), digest_hex)
    legacy = hashlib.sha256(password.encode()).hexdigest()
    return hmac.compare_digest(legacy, stored)


def is_legacy_hash(stored: str) -> bool:
    return not stored.startswith("scrypt$")


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _unb64(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def _sign(payload: str, secret_key: str) -> str:
    return hmac.new(secret_key.encode(), payload.encode(), hashlib.sha256).hexdigest()


def create_token(username: str, secret_key: str, ttl_seconds: int) -> str:
    """Create a signed, expiring session token: base64url(json).hmac_sha256."""
    payload = _b64(json.dumps({"sub": username, "exp": int(time.time()) + ttl_seconds}).encode())
    return f"{payload}.{_sign(payload, secret_key)}"


def verify_token(token: str, secret_key: str) -> Optional[str]:
    """Return the username if the token is authentic and unexpired."""
    try:
        payload, signature = token.split(".")
        if not hmac.compare_digest(signature, _sign(payload, secret_key)):
            return None
        claims = json.loads(_unb64(payload))
        if claims["exp"] < time.time():
            return None
        return claims["sub"]
    except (ValueError, KeyError, TypeError):
        return None
