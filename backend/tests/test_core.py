import pytest

from app.core import security
from app.core.dns_names import is_valid_domain, normalize_record_name
from app.validators import default_registry


def test_password_hash_is_salted_and_verifiable():
    first, second = security.hash_password("secret"), security.hash_password("secret")
    assert first != second
    assert security.verify_password("secret", first)
    assert not security.verify_password("wrong", first)


def test_legacy_sha256_hash_still_verifies():
    import hashlib

    legacy = hashlib.sha256(b"admin").hexdigest()
    assert security.is_legacy_hash(legacy)
    assert security.verify_password("admin", legacy)


def test_token_round_trip_expiry_and_tampering():
    token = security.create_token("admin", "key", 60)
    assert security.verify_token(token, "key") == "admin"
    assert security.verify_token(token, "other-key") is None
    assert security.verify_token(token + "x", "key") is None
    expired = security.create_token("admin", "key", -1)
    assert security.verify_token(expired, "key") is None
    assert security.verify_token("garbage", "key") is None


@pytest.mark.parametrize(
    "name,expected",
    [
        ("", "example.com."),
        ("@", "example.com."),
        ("www", "www.example.com."),
        ("WWW.Example.com", "www.example.com."),
        ("www.example.com.", "www.example.com."),
        ("*.example.com", "*.example.com."),
        ("_dmarc", "_dmarc.example.com."),
    ],
)
def test_normalize_record_name(name, expected):
    assert normalize_record_name(name, "example.com.") == expected


def test_normalize_rejects_names_outside_zone():
    with pytest.raises(ValueError):
        normalize_record_name("www.other.com.", "example.com.")
    with pytest.raises(ValueError):
        normalize_record_name("notexample.com.", "example.com.")


@pytest.mark.parametrize("name,ok", [("example.com", True), ("a-b.co.uk.", True), ("-bad.com", False), ("a_b.com", False), ("", False)])
def test_zone_name_validation(name, ok):
    assert is_valid_domain(name, zone_name=True) is ok


@pytest.mark.parametrize(
    "record_type,value,valid",
    [
        ("A", "192.0.2.1", True),
        ("A", "999.1.1.1", False),
        ("A", "::1", False),
        ("AAAA", "2001:db8::1", True),
        ("AAAA", "192.0.2.1", False),
        ("CNAME", "target.example.org.", True),
        ("CNAME", "a.example.org\nb.example.org", False),
        ("MX", "10 mail.example.com.", True),
        ("MX", "mail.example.com.", False),
        ("MX", "99999 mail.example.com.", False),
        ("SRV", "1 10 5060 sip.example.com.", True),
        ("SRV", "1 10 sip.example.com.", False),
        ("TXT", '"v=spf1 -all"', True),
        ("TXT", '"unbalanced', False),
        ("CAA", '0 issue "letsencrypt.org"', True),
        ("CAA", "issue letsencrypt.org", False),
        ("PTR", "host.example.com.", True),
        ("NS", "ns1.example.com.", True),
        ("NS", "not a host", False),
    ],
)
def test_record_value_validators(record_type, value, valid):
    lines = [line for line in value.split("\n") if line]
    errors = default_registry.get(record_type).validate(lines)
    assert (errors == []) is valid, errors


def test_registry_covers_all_assignment_types():
    assert set(default_registry.supported_types()) >= {"A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"}
