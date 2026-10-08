"""Sample hosted zones for the demo account.

Plain data on purpose: `DemoService` pushes it through the normal zone and record services, so the
demo content obeys exactly the same validation and conflict rules as anything a user creates.
"""
from typing import Any, Dict, List

Zone = Dict[str, Any]

DEMO_ZONES: List[Zone] = [
    {
        "name": "example.com",
        "description": "Primary production domain",
        "records": [
            {"name": "", "type": "A", "value": "192.0.2.10", "ttl": 300},
            {"name": "www", "type": "CNAME", "value": "example.com", "ttl": 300},
            {"name": "", "type": "MX", "value": "10 mail.example.com\n20 mail2.example.com", "ttl": 3600},
            {"name": "", "type": "TXT", "value": '"v=spf1 include:_spf.example.com ~all"', "ttl": 300},
            {"name": "_dmarc", "type": "TXT", "value": '"v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com"', "ttl": 300},
            {"name": "", "type": "CAA", "value": '0 issue "letsencrypt.org"', "ttl": 3600},
            {"name": "mail", "type": "A", "value": "192.0.2.25", "ttl": 300},
            {"name": "mail", "type": "AAAA", "value": "2001:db8::25", "ttl": 300},
            {"name": "_sip._tcp", "type": "SRV", "value": "1 10 5060 sip.example.com", "ttl": 300},
            {"name": "api", "type": "A", "value": "198.51.100.1", "ttl": 60, "routing_policy": "Weighted", "weight": 70, "set_id": "primary"},
            {"name": "api", "type": "A", "value": "198.51.100.2", "ttl": 60, "routing_policy": "Weighted", "weight": 30, "set_id": "canary"},
            {"name": "cdn", "type": "A", "alias": True, "alias_target": "d111111abcdef8.cloudfront.net"},
            {"name": "docs", "type": "CNAME", "value": "example.github.io", "ttl": 600},
            {"name": "staging", "type": "NS", "value": "ns1.staging.example.com\nns2.staging.example.com", "ttl": 172800},
        ],
    },
    {
        "name": "acme-corp.io",
        "description": "Acme Corp marketing site",
        "records": [
            {"name": "", "type": "A", "value": "203.0.113.20\n203.0.113.21", "ttl": 300},
            {"name": "www", "type": "CNAME", "value": "acme-corp.io", "ttl": 300},
            {"name": "blog", "type": "CNAME", "value": "acme.ghost.io", "ttl": 600},
            {"name": "", "type": "TXT", "value": '"google-site-verification=abc123"', "ttl": 300},
        ],
    },
    {
        "name": "shop.example.net",
        "description": "Storefront",
        "records": [
            {"name": "", "type": "A", "alias": True, "alias_target": "shop-alb-123456.us-east-1.elb.amazonaws.com"},
            {"name": "checkout", "type": "A", "value": "198.51.100.40", "ttl": 120},
            {"name": "*", "type": "CNAME", "value": "shop.example.net", "ttl": 300},
        ],
    },
    {
        "name": "corp.internal",
        "description": "Private zone for internal services",
        "type": "Private",
        "vpc_id": "vpc-0a1b2c3d4e5f67890",
        "vpc_region": "us-east-1",
        "records": [
            {"name": "db", "type": "A", "value": "10.0.1.15", "ttl": 60},
            {"name": "cache", "type": "A", "value": "10.0.1.30", "ttl": 60},
            {"name": "10.1.0", "type": "PTR", "value": "db.corp.internal", "ttl": 300},
        ],
    },
    {"name": "bluepeak.dev", "description": "Developer portal", "records": [{"name": "", "type": "A", "value": "192.0.2.77", "ttl": 300}]},
    {"name": "northwind.org", "description": "Non-profit site", "records": [{"name": "www", "type": "CNAME", "value": "northwind.org", "ttl": 300}]},
    {"name": "tailspin.co", "description": "Staging environment", "records": []},
    {"name": "contoso.app", "description": "Mobile app backend", "records": [{"name": "api", "type": "A", "value": "198.51.100.90", "ttl": 60}]},
    {"name": "fabrikam.cloud", "description": "Partner portal", "records": []},
    {"name": "litware.tech", "description": "Internal tools", "records": [{"name": "", "type": "TXT", "value": '"v=spf1 -all"', "ttl": 300}]},
    {"name": "wingtip.biz", "description": "Retired campaign", "records": []},
    {"name": "adventure-works.info", "description": "Documentation", "records": [{"name": "docs", "type": "CNAME", "value": "adventure-works.readthedocs.io", "ttl": 600}]},
]
