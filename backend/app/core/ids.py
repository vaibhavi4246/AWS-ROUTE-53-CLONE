import secrets
import string

_ALPHABET = string.ascii_uppercase + string.digits


def generate_id(prefix: str, length: int = 13) -> str:
    """Generate an AWS-style identifier such as Z01485693R4P9X."""
    return prefix + "".join(secrets.choice(_ALPHABET) for _ in range(length))
