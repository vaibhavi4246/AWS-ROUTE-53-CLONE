from dataclasses import replace

from app.core.config import get_settings
from app.main import app
from app.services.demo_data import DEMO_ZONES

EXPECTED_ZONES = len(DEMO_ZONES)
EXPECTED_RECORDS = sum(len(zone["records"]) for zone in DEMO_ZONES)


def zone_total(client) -> int:
    return client.get("/api/hosted-zones?page_size=100").json()["total"]


def test_demo_login_signs_in_and_loads_sample_data(anon_client):
    response = anon_client.post("/api/auth/demo")
    assert response.status_code == 200
    body = response.json()
    assert body["seeded"] is True
    assert body["user"]["username"] == "demo" and body["user"]["is_demo"] is True

    assert anon_client.get("/api/auth/me").json()["is_demo"] is True  # cookie session works
    assert zone_total(anon_client) == EXPECTED_ZONES


def test_sample_data_is_complete_and_valid(anon_client):
    """Every sample record passes the same validation as user input, so none were silently dropped."""
    anon_client.post("/api/auth/demo")
    zones = anon_client.get("/api/hosted-zones?page_size=100").json()["items"]
    # Each zone also has its apex NS and SOA records.
    assert sum(z["record_count"] for z in zones) == EXPECTED_RECORDS + 2 * EXPECTED_ZONES
    assert EXPECTED_ZONES > 10  # enough to show pagination

    example = next(z for z in zones if z["name"] == "example.com.")
    items = anon_client.get(f"/api/hosted-zones/{example['id']}/records?page_size=50").json()["items"]
    assert {"A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA", "SOA"} <= {r["type"] for r in items}
    assert any(r["routing_policy"] == "Weighted" for r in items)
    assert any(r["alias"] for r in items)


def test_demo_login_does_not_duplicate_data(anon_client):
    assert anon_client.post("/api/auth/demo").json()["seeded"] is True
    assert anon_client.post("/api/auth/demo").json()["seeded"] is False
    assert zone_total(anon_client) == EXPECTED_ZONES


def test_demo_login_keeps_existing_zones(anon_client):
    anon_client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    anon_client.post("/api/hosted-zones", json={"name": "mine.com"})
    assert anon_client.post("/api/auth/demo").json()["seeded"] is False
    assert zone_total(anon_client) == 1


def test_demo_account_has_no_usable_password(anon_client):
    anon_client.post("/api/auth/demo")
    anon_client.cookies.clear()
    for password in ("demo", "admin", "password"):
        response = anon_client.post("/api/auth/login", json={"username": "demo", "password": password})
        assert response.status_code == 401


def test_admin_is_not_flagged_as_demo_and_cannot_reset(anon_client):
    anon_client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert anon_client.get("/api/auth/me").json()["is_demo"] is False
    anon_client.post("/api/hosted-zones", json={"name": "keep-me.com"})
    assert anon_client.post("/api/demo/reset").status_code == 403
    assert zone_total(anon_client) == 1  # nothing was wiped


def test_reset_restores_sample_data(anon_client):
    anon_client.post("/api/auth/demo")
    anon_client.post("/api/hosted-zones", json={"name": "extra.com"})
    first = anon_client.get("/api/hosted-zones?query=example.com").json()["items"][0]
    anon_client.delete(f"/api/hosted-zones/{first['id']}")
    assert zone_total(anon_client) == EXPECTED_ZONES  # one added, one deleted

    result = anon_client.post("/api/demo/reset")
    assert result.status_code == 200
    assert result.json() == {"zones": EXPECTED_ZONES, "records": EXPECTED_RECORDS}
    names = {z["name"] for z in anon_client.get("/api/hosted-zones?page_size=100").json()["items"]}
    assert "extra.com." not in names and "example.com." in names


def test_reset_requires_authentication(anon_client):
    assert anon_client.post("/api/demo/reset").status_code == 401


def test_demo_can_be_disabled(anon_client):
    app.dependency_overrides[get_settings] = lambda: replace(get_settings(), demo_enabled=False)
    assert anon_client.post("/api/auth/demo").status_code == 404
    # With the feature off, nobody counts as the demo user, not even one named "demo".
    anon_client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert anon_client.post("/api/demo/reset").status_code == 403
