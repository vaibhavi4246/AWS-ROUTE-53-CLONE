import json
from typing import List

from ..models import DNSRecord, HostedZone
from ..schemas import HostedZoneOut, RecordOut
from .base import ZoneFormat

_RECORD_FIELDS = (
    "name", "type", "routing_policy", "ttl", "value", "weight", "set_id", "alias", "alias_target", "health_check_id"
)


class JsonFormat(ZoneFormat):
    name = "json"
    extension = "json"
    media_type = "application/json"

    def dump(self, zone: HostedZone, records: List[DNSRecord]) -> str:
        document = {
            "zone": HostedZoneOut.model_validate(zone).model_dump(mode="json"),
            "records": [RecordOut.model_validate(r).model_dump(mode="json") for r in records],
        }
        return json.dumps(document, indent=2)

    def parse(self, text: str, zone_name: str) -> List[dict]:
        try:
            document = json.loads(text)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSON: {exc}") from exc
        records = document.get("records") if isinstance(document, dict) else document
        if not isinstance(records, list):
            raise ValueError("Expected a JSON array of records or an object with a 'records' array.")
        return [
            {key: item[key] for key in _RECORD_FIELDS if key in item}
            for item in records
            if isinstance(item, dict)
        ]
