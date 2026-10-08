def make_zone(client, name="example.com", **extra):
    response = client.post("/api/hosted-zones", json={"name": name, **extra})
    assert response.status_code == 201, response.text
    return response.json()


def record(name="www", type="A", value="192.0.2.1", **extra):
    return {"name": name, "type": type, "value": value, "ttl": 300, **extra}


# ---- auth -------------------------------------------------------------------

def test_requires_authentication(client):
    client.cookies.clear()
    assert client.get("/api/hosted-zones").status_code == 401


def test_login_logout_and_session_persistence(client):
    assert client.get("/api/auth/me").json()["username"] == "admin"
    assert client.post("/api/auth/logout").status_code == 200
    client.cookies.clear()
    assert client.get("/api/auth/me").status_code == 401


def test_bad_credentials_rejected(client):
    client.cookies.clear()
    response = client.post("/api/auth/login", json={"username": "admin", "password": "nope"})
    assert response.status_code == 401


# ---- hosted zones -----------------------------------------------------------

def test_create_zone_adds_apex_ns_and_soa(client):
    zone = make_zone(client, "testzone.com", description="demo")
    assert zone["name"] == "testzone.com."
    assert zone["record_count"] == 2
    records = client.get(f"/api/hosted-zones/{zone['id']}/records").json()["items"]
    assert [r["type"] for r in records] == ["NS", "SOA"]


def test_zone_list_search_sort_and_pagination(client):
    for name in ["alpha.com", "bravo.com", "charlie.org", "delta.org", "echo.net"]:
        make_zone(client, name)
    page = client.get("/api/hosted-zones?page=1&page_size=2").json()
    assert page["total"] == 5 and len(page["items"]) == 2 and page["page"] == 1
    assert page["items"][0]["name"] == "alpha.com."

    searched = client.get("/api/hosted-zones?query=.org").json()
    assert searched["total"] == 2

    descending = client.get("/api/hosted-zones?sort_by=name&sort_dir=desc&page_size=1").json()
    assert descending["items"][0]["name"] == "echo.net."


def test_zone_validation(client):
    assert client.post("/api/hosted-zones", json={"name": "bad_name!.com"}).status_code == 422
    private_without_vpc = client.post("/api/hosted-zones", json={"name": "corp.local", "type": "Private"})
    assert private_without_vpc.status_code == 422
    assert "VPC" in private_without_vpc.json()["detail"]


def test_update_and_delete_zone(client):
    zone = make_zone(client)
    updated = client.put(f"/api/hosted-zones/{zone['id']}", json={"description": "new text"})
    assert updated.json()["description"] == "new text"
    assert client.delete(f"/api/hosted-zones/{zone['id']}").status_code == 204
    assert client.get(f"/api/hosted-zones/{zone['id']}").status_code == 404


# ---- records ----------------------------------------------------------------

def test_record_crud_and_record_count(client):
    zone = make_zone(client)
    base = f"/api/hosted-zones/{zone['id']}"

    created = client.post(f"{base}/records", json=record())
    assert created.status_code == 201
    assert created.json()["name"] == "www.example.com."
    assert client.get(base).json()["record_count"] == 3

    rec_id = created.json()["id"]
    updated = client.put(f"{base}/records/{rec_id}", json=record(value="192.0.2.99", ttl=60))
    assert updated.json()["value"] == "192.0.2.99" and updated.json()["ttl"] == 60

    assert client.delete(f"{base}/records/{rec_id}").status_code == 204
    assert client.get(base).json()["record_count"] == 2


def test_record_search_filter_and_pagination(client):
    zone = make_zone(client)
    base = f"/api/hosted-zones/{zone['id']}/records"
    for i in range(12):
        client.post(base, json=record(name=f"host{i}", value=f"10.0.0.{i}"))
    client.post(base, json=record(name="mail", type="MX", value="10 mx.example.net."))

    first = client.get(f"{base}?page_size=10").json()
    assert first["total"] == 15 and len(first["items"]) == 10
    assert [r["type"] for r in first["items"][:2]] == ["NS", "SOA"]  # apex first

    assert client.get(f"{base}?type=MX").json()["total"] == 1
    assert client.get(f"{base}?query=host1").json()["total"] == 3  # host1, host10, host11


def test_default_record_order_puts_all_apex_records_first(client):
    zone = make_zone(client)
    base = f"/api/hosted-zones/{zone['id']}/records"
    client.post(base, json=record(name="api", value="10.0.0.1", routing_policy="Weighted", weight=10, set_id="b"))
    client.post(base, json=record(name="api", value="10.0.0.2", routing_policy="Weighted", weight=10, set_id="a"))
    client.post(base, json=record(name="", type="TXT", value='"hello"'))
    client.post(base, json=record(name="", type="MX", value="10 mail.example.com."))
    client.post(base, json=record(name="app", value="10.0.0.3"))
    client.post(base, json=record(name="dev", type="NS", value="ns1.dev.example.com"))

    items = client.get(f"{base}?page_size=20").json()["items"]
    apex = [r["type"] for r in items if r["name"] == "example.com."]
    assert [r["name"] for r in items[: len(apex)]] == ["example.com."] * len(apex)
    assert apex == ["NS", "SOA", "MX", "TXT"]
    rest = [(r["name"], r["set_id"]) for r in items[len(apex):]]
    assert rest == [
        ("api.example.com.", "a"),
        ("api.example.com.", "b"),
        ("app.example.com.", None),
        ("dev.example.com.", None),  # a subdomain NS sorts by name, not ahead of the others
    ]


def test_record_value_validation_errors(client):
    zone = make_zone(client)
    base = f"/api/hosted-zones/{zone['id']}/records"
    bad_ip = client.post(base, json=record(value="not-an-ip"))
    assert bad_ip.status_code == 422
    assert bad_ip.json()["errors"][0]["field"] == "value"
    assert client.post(base, json=record(name="www.other.com.")).status_code == 422
    assert client.post(base, json=record(type="BOGUS")).status_code == 422
    assert client.post(base, json=record(ttl=-5)).status_code == 422


def test_duplicate_and_cname_conflicts(client):
    zone = make_zone(client)
    base = f"/api/hosted-zones/{zone['id']}/records"
    assert client.post(base, json=record()).status_code == 201
    assert client.post(base, json=record()).status_code == 409
    assert client.post(base, json=record(type="CNAME", value="x.example.org.")).status_code == 409
    assert client.post(base, json=record(name="app", type="CNAME", value="x.example.org.")).status_code == 201
    assert client.post(base, json=record(name="app", value="192.0.2.5")).status_code == 409


def test_weighted_records_share_a_name(client):
    zone = make_zone(client)
    base = f"/api/hosted-zones/{zone['id']}/records"
    weighted = {"routing_policy": "Weighted", "weight": 50}
    assert client.post(base, json=record(**weighted, set_id="a")).status_code == 201
    assert client.post(base, json=record(value="192.0.2.2", **weighted, set_id="b")).status_code == 201
    assert client.post(base, json=record(value="192.0.2.3", **weighted, set_id="a")).status_code == 409
    assert client.post(base, json=record(routing_policy="Weighted")).status_code == 422  # needs weight + set id


def test_alias_record(client):
    zone = make_zone(client)
    base = f"/api/hosted-zones/{zone['id']}/records"
    created = client.post(base, json={"name": "cdn", "type": "A", "alias": True, "alias_target": "d111.cloudfront.net."})
    assert created.status_code == 201 and created.json()["alias"] is True
    assert client.post(base, json={"name": "x", "type": "NS", "alias": True, "alias_target": "a.b."}).status_code == 422


def test_apex_ns_soa_are_protected_server_side(client):
    zone = make_zone(client)
    base = f"/api/hosted-zones/{zone['id']}/records"
    ns = next(r for r in client.get(base).json()["items"] if r["type"] == "NS")
    assert client.delete(f"{base}/{ns['id']}").status_code == 422
    assert client.put(f"{base}/{ns['id']}", json=record(name="", type="NS", value="ns.example.org.")).status_code == 422
    assert client.post(base, json=record(name="", type="NS", value="ns.example.org.")).status_code == 422
    bulk = client.post(f"{base}/bulk-delete", json={"record_ids": [ns["id"]]})
    assert bulk.json() == {"deleted_count": 0, "skipped_count": 1}


def test_record_must_belong_to_zone_in_url(client):
    zone_a, zone_b = make_zone(client, "a.com"), make_zone(client, "b.com")
    rec = client.post(f"/api/hosted-zones/{zone_a['id']}/records", json=record()).json()
    other = f"/api/hosted-zones/{zone_b['id']}/records/{rec['id']}"
    assert client.get(f"/api/hosted-zones/{zone_a['id']}/records/{rec['id']}").json()["id"] == rec["id"]
    assert client.get(other).status_code == 404
    assert client.put(other, json=record(name="www.b.com.")).status_code == 404
    assert client.delete(other).status_code == 404


def test_bulk_delete(client):
    zone = make_zone(client)
    base = f"/api/hosted-zones/{zone['id']}/records"
    ids = [client.post(base, json=record(name=f"h{i}", value=f"10.0.0.{i}")).json()["id"] for i in range(3)]
    result = client.post(f"{base}/bulk-delete", json={"record_ids": ids}).json()
    assert result == {"deleted_count": 3, "skipped_count": 0}
    assert client.get(f"/api/hosted-zones/{zone['id']}").json()["record_count"] == 2


# ---- import / export --------------------------------------------------------

BIND_FILE = """$ORIGIN example.com.
$TTL 300
@ IN SOA ns1.example.com. admin.example.com. 1 7200 900 1209600 86400
@ IN NS ns1.example.com.
www IN A 192.0.2.10
mail IN MX 10 mx.example.com.
txt IN TXT "hello world"
bad IN SPF "v=spf1 -all"
"""


def test_bind_import_reports_skipped_records(client):
    zone = make_zone(client)
    base = f"/api/hosted-zones/{zone['id']}"
    response = client.post(f"{base}/import?format=bind", files={"file": ("zone.txt", BIND_FILE, "text/plain")})
    assert response.status_code == 200
    body = response.json()
    assert body["imported_count"] == 3
    skipped_types = {s["type"] for s in body["skipped"]}
    assert {"SOA", "NS", "SPF"} <= skipped_types


def test_bind_and_json_export(client):
    zone = make_zone(client, "myzone.org")
    base = f"/api/hosted-zones/{zone['id']}"
    client.post(f"{base}/records", json=record(name="api", value="10.0.0.5\n10.0.0.6", ttl=600))
    client.post(f"{base}/records", json={"name": "cdn", "type": "A", "alias": True, "alias_target": "d1.cloudfront.net."})

    bind = client.get(f"{base}/export?format=bind")
    assert "$ORIGIN myzone.org." in bind.text
    assert "api\t600\tIN\tA\t10.0.0.5" in bind.text
    assert "api\t600\tIN\tA\t10.0.0.6" in bind.text
    assert "@\t900\tIN\tSOA\t" in bind.text
    assert "; ALIAS cdn A -> d1.cloudfront.net." in bind.text
    assert 'filename="myzone.org.zone"' in bind.headers["content-disposition"]

    exported = client.get(f"{base}/export?format=json").json()
    assert exported["zone"]["name"] == "myzone.org."
    assert len(exported["records"]) == 4


def test_json_round_trip_import(client):
    source = make_zone(client, "src.com")
    client.post(f"/api/hosted-zones/{source['id']}/records", json=record(value="192.0.2.7"))
    dump = client.get(f"/api/hosted-zones/{source['id']}/export?format=json").text
    target = make_zone(client, "src.com")
    result = client.post(
        f"/api/hosted-zones/{target['id']}/import?format=json", files={"file": ("z.json", dump, "application/json")}
    ).json()
    assert result["imported_count"] == 1


def test_import_rejects_garbage_and_unknown_format(client):
    zone = make_zone(client)
    base = f"/api/hosted-zones/{zone['id']}"
    assert client.post(f"{base}/import?format=json", files={"file": ("z", "not json", "text/plain")}).status_code == 422
    assert client.post(f"{base}/import?format=yaml", files={"file": ("z", "x", "text/plain")}).status_code == 422
    assert client.get(f"{base}/export?format=yaml").status_code == 422
