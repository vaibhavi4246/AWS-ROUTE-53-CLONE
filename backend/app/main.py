from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api import auth, demo, hosted_zones, records, transfer
from .core.config import get_settings
from .core.errors import DomainError
from .database import SessionLocal, ensure_schema
from .repositories import SqlAlchemyUserRepository
from .services import AuthService


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_schema()
    db = SessionLocal()
    try:
        AuthService(SqlAlchemyUserRepository(db), get_settings()).ensure_default_user()
    finally:
        db.close()
    yield


app = FastAPI(title="AWS Route53 Clone API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(DomainError)
async def handle_domain_error(_: Request, exc: DomainError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message, "errors": exc.errors})


@app.exception_handler(RequestValidationError)
async def handle_request_validation(_: Request, exc: RequestValidationError) -> JSONResponse:
    """Flatten pydantic errors into {detail: str, errors: [{field, message}]} for the UI."""
    errors = []
    for error in exc.errors():
        location = [str(part) for part in error["loc"] if part not in ("body", "query", "path")]
        errors.append({"field": ".".join(location), "message": error["msg"].removeprefix("Value error, ")})
    detail = "; ".join(e["message"] for e in errors) or "Invalid request"
    return JSONResponse(status_code=422, content={"detail": detail, "errors": errors})


for router in (auth.router, demo.router, hosted_zones.router, records.router, transfer.router):
    app.include_router(router)


@app.get("/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok"}
