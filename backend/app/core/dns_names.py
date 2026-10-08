import re

_LABEL_RE = re.compile(r"^[a-z0-9_]([a-z0-9_-]{0,61}[a-z0-9_])?$")
_ZONE_LABEL_RE = re.compile(r"^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$")
MAX_NAME_LENGTH = 253


def to_fqdn(name: str) -> str:
    """Lower-case, trim and ensure a trailing dot."""
    name = name.strip().lower()
    return name if name.endswith(".") else name + "."


def is_valid_domain(name: str, *, allow_wildcard: bool = False, zone_name: bool = False) -> bool:
    """Validate a DNS name (trailing dot optional).

    `zone_name` applies the stricter hostname rules used for hosted zone names
    (no underscores, no wildcards).
    """
    name = name.strip().lower().rstrip(".")
    if not name or len(name) > MAX_NAME_LENGTH:
        return False
    label_re = _ZONE_LABEL_RE if zone_name else _LABEL_RE
    labels = name.split(".")
    for index, label in enumerate(labels):
        if label == "*" and allow_wildcard and index == 0 and not zone_name:
            continue
        if not label_re.match(label):
            return False
    return True


def normalize_record_name(name: str, zone_name: str) -> str:
    """Resolve a user-supplied record name to an absolute name inside the zone.

    Accepts '', '@', a relative name ('www'), or an absolute name
    ('www.example.com' / 'www.example.com.'). Raises ValueError when the result
    is not a valid name inside the zone.
    """
    name = name.strip().lower()
    zone_bare = zone_name.rstrip(".")

    if name in ("", "@"):
        return zone_name
    if name.endswith("."):
        absolute = name
    elif name == zone_bare or name.endswith("." + zone_bare):
        absolute = name + "."
    else:
        absolute = f"{name}.{zone_name}"

    if absolute != zone_name and not absolute.endswith("." + zone_name):
        raise ValueError(f"Record name must be inside the hosted zone {zone_name}")
    if not is_valid_domain(absolute, allow_wildcard=True):
        raise ValueError(f"'{name}' is not a valid DNS record name")
    return absolute
