from typing import List, Optional, Tuple

from ..core.dns_names import is_valid_domain, normalize_record_name
from ..core.errors import ConflictError, DomainValidationError, NotFoundError
from ..core.ids import generate_id
from ..models import DNSRecord, HostedZone
from ..repositories.interfaces import RecordRepository, ZoneRepository
from ..schemas import RecordIn
from ..validators import ValidatorRegistry

ALIAS_TYPES = {"A", "AAAA", "CNAME", "MX", "TXT", "PTR", "SRV", "CAA"}
MANAGED_APEX_TYPES = {"NS", "SOA"}
APEX_MANAGED_MESSAGE = "Apex NS and SOA records are managed by Route 53 and cannot be changed."


def _field_error(field: str, message: str) -> DomainValidationError:
    return DomainValidationError(message, errors=[{"field": field, "message": message}])


class RecordService:
    def __init__(self, zones: ZoneRepository, records: RecordRepository, validators: ValidatorRegistry):
        self._zones = zones
        self._records = records
        self._validators = validators

    # ---- queries -------------------------------------------------------------

    def list(
        self, zone_id: str, query: Optional[str], record_type: Optional[str],
        sort_by: Optional[str], descending: bool, page: int, page_size: int,
    ) -> Tuple[List[DNSRecord], int]:
        self._zone(zone_id)
        return self._records.search(zone_id, query, record_type, sort_by, descending, (page - 1) * page_size, page_size)

    def get(self, zone_id: str, record_id: str) -> DNSRecord:
        self._zone(zone_id)
        return self._record(zone_id, record_id)

    # ---- commands ------------------------------------------------------------

    def create(self, zone_id: str, data: RecordIn) -> DNSRecord:
        zone = self._zone(zone_id)
        fields = self._prepare(zone, data, exclude_id=None)
        record = DNSRecord(id=generate_id("R"), hosted_zone_id=zone.id, **fields)
        return self._records.add(record)

    def update(self, zone_id: str, record_id: str, data: RecordIn) -> DNSRecord:
        zone = self._zone(zone_id)
        record = self._record(zone_id, record_id)
        self._assert_editable(zone, record)
        fields = self._prepare(zone, data, exclude_id=record.id)
        for key, value in fields.items():
            setattr(record, key, value)
        return self._records.save(record)

    def delete(self, zone_id: str, record_id: str) -> None:
        zone = self._zone(zone_id)
        record = self._record(zone_id, record_id)
        self._assert_editable(zone, record)
        self._records.delete_many(zone_id, [record])

    def bulk_delete(self, zone_id: str, record_ids: List[str]) -> Tuple[int, int]:
        """Delete the given records; apex NS/SOA and unknown ids are skipped. Returns (deleted, skipped)."""
        zone = self._zone(zone_id)
        deletable = []
        for record_id in dict.fromkeys(record_ids):
            record = self._records.get(zone_id, record_id)
            if record is not None and not self._is_managed(zone, record):
                deletable.append(record)
        if deletable:
            self._records.delete_many(zone_id, deletable)
        return len(deletable), len(set(record_ids)) - len(deletable)

    # ---- rules ---------------------------------------------------------------

    def _zone(self, zone_id: str) -> HostedZone:
        zone = self._zones.get(zone_id)
        if zone is None:
            raise NotFoundError("Hosted zone not found")
        return zone

    def _record(self, zone_id: str, record_id: str) -> DNSRecord:
        record = self._records.get(zone_id, record_id)
        if record is None:
            raise NotFoundError("DNS record not found")
        return record

    @staticmethod
    def _is_managed(zone: HostedZone, record: DNSRecord) -> bool:
        return record.name == zone.name and record.type in MANAGED_APEX_TYPES

    def _assert_editable(self, zone: HostedZone, record: DNSRecord) -> None:
        if self._is_managed(zone, record):
            raise DomainValidationError(APEX_MANAGED_MESSAGE)

    def _prepare(self, zone: HostedZone, data: RecordIn, exclude_id: Optional[str]) -> dict:
        """Validate a payload against the zone and return normalised column values."""
        try:
            name = normalize_record_name(data.name, zone.name)
        except ValueError as exc:
            raise _field_error("name", str(exc)) from exc

        if name == zone.name and data.type in MANAGED_APEX_TYPES:
            raise _field_error("type", APEX_MANAGED_MESSAGE)

        if data.alias:
            if data.type not in ALIAS_TYPES:
                raise _field_error("alias", f"Alias is not supported for {data.type} records.")
            if not is_valid_domain(data.alias_target or ""):
                raise _field_error("alias_target", "Alias target must be a valid DNS name.")
            value, ttl = "", 0
        else:
            lines = [line.strip() for line in data.value.splitlines() if line.strip()]
            validator = self._validators.get(data.type)
            errors = validator.validate(lines) if validator else [f"Unsupported record type {data.type}"]
            if errors:
                raise DomainValidationError(
                    errors[0], errors=[{"field": "value", "message": message} for message in errors]
                )
            value, ttl = "\n".join(lines), data.ttl

        fields = {
            "name": name,
            "type": data.type,
            "routing_policy": data.routing_policy,
            "ttl": ttl,
            "value": value,
            "weight": data.weight,
            "set_id": data.set_id.strip() if data.set_id else None,
            "alias": data.alias,
            "alias_target": data.alias_target.strip() if data.alias and data.alias_target else None,
            "health_check_id": data.health_check_id,
        }
        self._check_conflicts(zone.id, fields, exclude_id)
        return fields

    def _check_conflicts(self, zone_id: str, fields: dict, exclude_id: Optional[str]) -> None:
        name, record_type = fields["name"], fields["type"]
        siblings = [r for r in self._records.find_by_name(zone_id, name) if r.id != exclude_id]
        same_type = [r for r in siblings if r.type == record_type]

        if record_type == "CNAME" and any(r.type != "CNAME" for r in siblings):
            raise ConflictError(f"A CNAME record cannot coexist with other record types at '{name}'.")
        if record_type != "CNAME" and any(r.type == "CNAME" for r in siblings):
            raise ConflictError(f"'{name}' already has a CNAME record; no other record types can share its name.")

        if fields["routing_policy"] == "Simple":
            if same_type:
                raise ConflictError(
                    f"A {record_type} record named '{name}' already exists. Use weighted routing to create several."
                )
        else:
            if any(r.routing_policy == "Simple" for r in same_type):
                raise ConflictError(f"A simple {record_type} record named '{name}' already exists.")
            if any(r.set_id == fields["set_id"] for r in same_type):
                raise ConflictError(f"A record with Record ID '{fields['set_id']}' already exists for '{name}'.")
