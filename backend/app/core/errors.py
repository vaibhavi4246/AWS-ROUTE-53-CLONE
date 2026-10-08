from typing import Optional


class DomainError(Exception):
    """Base class for errors raised by the service layer.

    The API layer maps each subclass to an HTTP status in a single handler, so
    services never import FastAPI.
    """

    status_code = 400

    def __init__(self, message: str, errors: Optional[list[dict]] = None):
        super().__init__(message)
        self.message = message
        self.errors = errors or []


class NotFoundError(DomainError):
    status_code = 404


class ConflictError(DomainError):
    status_code = 409


class DomainValidationError(DomainError):
    status_code = 422


class AuthenticationError(DomainError):
    status_code = 401


class ForbiddenError(DomainError):
    status_code = 403
