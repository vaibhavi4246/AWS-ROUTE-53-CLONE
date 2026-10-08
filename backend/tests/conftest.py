import os
import sys

# Point the app at a throwaway database *before* it is imported.
os.environ["DATABASE_URL"] = "sqlite:///./test_route53.db"
os.environ["SECRET_KEY"] = "test-secret"
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app


@pytest.fixture()
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    with TestClient(app) as test_client:  # lifespan creates tables + seeds admin
        response = test_client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
        assert response.status_code == 200
        yield test_client


@pytest.fixture()
def anon_client():
    """A client that has not signed in (for the demo-login tests)."""
    Base.metadata.drop_all(bind=engine)
    with TestClient(app) as test_client:
        yield test_client
        app.dependency_overrides.clear()


def pytest_sessionfinish(session, exitstatus):
    engine.dispose()
    try:
        os.remove("test_route53.db")
    except OSError:
        pass
