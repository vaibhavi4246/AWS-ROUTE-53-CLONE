"""Per-type record value validation.

Each DNS type has one validator class. Supporting a new type means adding a
class and registering it; no existing code changes (open/closed principle).
All validators share the `RecordValueValidator` contract, so the registry can
treat them interchangeably (Liskov).
"""
import ipaddress
import re
from abc import ABC, abstractmethod
from typing import ClassVar, Dict, List, Optional

from ..core.dns_names import is_valid_domain

UINT16_MAX = 65535


class RecordValueValidator(ABC):
    record_type: ClassVar[str]
    single_value: ClassVar[bool] = False

    @abstractmethod
    def check_line(self, line: str) -> Optional[str]:
        """Return an error message for one value line, or None when valid."""

    def validate(self, lines: List[str]) -> List[str]:
        """Validate all value lines and return a list of error messages."""
        if not lines:
            return [f"At least one {self.record_type} value is required."]
        if self.single_value and len(lines) > 1:
            return [f"A {self.record_type} record accepts exactly one value."]
        errors = []
        for line in lines:
            message = self.check_line(line)
            if message:
                errors.append(f"'{line}': {message}")
        return errors


def _uint16(text: str) -> bool:
    return text.isdigit() and 0 <= int(text) <= UINT16_MAX


class AValidator(RecordValueValidator):
    record_type = "A"

    def check_line(self, line: str) -> Optional[str]:
        try:
            ipaddress.IPv4Address(line)
        except ValueError:
            return "not a valid IPv4 address"
        return None


class AAAAValidator(RecordValueValidator):
    record_type = "AAAA"

    def check_line(self, line: str) -> Optional[str]:
        try:
            ipaddress.IPv6Address(line)
        except ValueError:
            return "not a valid IPv6 address"
        return None


class DomainTargetValidator(RecordValueValidator):
    """Shared behaviour for records whose value is a single domain name."""

    def check_line(self, line: str) -> Optional[str]:
        return None if is_valid_domain(line) else "not a valid domain name"


class CNAMEValidator(DomainTargetValidator):
    record_type = "CNAME"
    single_value = True


class PTRValidator(DomainTargetValidator):
    record_type = "PTR"


class NSValidator(DomainTargetValidator):
    record_type = "NS"


class MXValidator(RecordValueValidator):
    record_type = "MX"

    def check_line(self, line: str) -> Optional[str]:
        parts = line.split()
        if len(parts) != 2:
            return "expected '<priority> <mail server>' e.g. 10 mail.example.com."
        if not _uint16(parts[0]):
            return "priority must be an integer between 0 and 65535"
        if not is_valid_domain(parts[1]):
            return "mail server is not a valid domain name"
        return None


class SRVValidator(RecordValueValidator):
    record_type = "SRV"

    def check_line(self, line: str) -> Optional[str]:
        parts = line.split()
        if len(parts) != 4:
            return "expected '<priority> <weight> <port> <target>' e.g. 1 10 5060 sip.example.com."
        if not all(_uint16(p) for p in parts[:3]):
            return "priority, weight and port must be integers between 0 and 65535"
        if parts[3] != "." and not is_valid_domain(parts[3]):
            return "target is not a valid domain name"
        return None


class TXTValidator(RecordValueValidator):
    record_type = "TXT"
    MAX_LENGTH = 4000

    def check_line(self, line: str) -> Optional[str]:
        if len(line) > self.MAX_LENGTH:
            return f"must be at most {self.MAX_LENGTH} characters"
        if line.startswith('"') != line.endswith('"') or line == '"':
            return "unbalanced double quotes"
        return None


class CAAValidator(RecordValueValidator):
    record_type = "CAA"
    _pattern = re.compile(r'^(\d{1,3})\s+([A-Za-z0-9]+)\s+("[^"]*"|\S+)$')

    def check_line(self, line: str) -> Optional[str]:
        match = self._pattern.match(line)
        if not match:
            return 'expected \'<flags> <tag> "<value>"\' e.g. 0 issue "letsencrypt.org"'
        if int(match.group(1)) > 255:
            return "flags must be between 0 and 255"
        return None


class ValidatorRegistry:
    def __init__(self) -> None:
        self._validators: Dict[str, RecordValueValidator] = {}

    def register(self, validator: RecordValueValidator) -> None:
        self._validators[validator.record_type] = validator

    def get(self, record_type: str) -> Optional[RecordValueValidator]:
        return self._validators.get(record_type)

    def supported_types(self) -> List[str]:
        return sorted(self._validators)


def _build_default_registry() -> ValidatorRegistry:
    registry = ValidatorRegistry()
    for validator in (
        AValidator(), AAAAValidator(), CNAMEValidator(), MXValidator(), NSValidator(),
        PTRValidator(), SRVValidator(), TXTValidator(), CAAValidator(),
    ):
        registry.register(validator)
    return registry


default_registry = _build_default_registry()
