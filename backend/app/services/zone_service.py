import random
from typing import List, Optional, Tuple

from ..core.errors import NotFoundError
from ..core.ids import generate_id
from ..models import DNSRecord, HostedZone
from ..repositories.interfaces import ZoneRepository
from ..schemas import HostedZoneIn, HostedZoneUpdate


def _generate_name_servers() -> List[str]:
    return [
        f"ns-{random.randint(100, 2000)}.awsdns-{random.randint(10, 63)}.com.",
        f"ns-{random.randint(100, 2000)}.awsdns-{random.randint(10, 63)}.org.",
        f"ns-{random.randint(100, 999)}.awsdns-{random.randint(10, 63)}.co.uk.",
        f"ns-{random.randint(100, 2000)}.awsdns-{random.randint(10, 63)}.net.",
    ]


class ZoneService:
    def __init__(self, zones: ZoneRepository):
        self._zones = zones

    def get(self, zone_id: str) -> HostedZone:
        zone = self._zones.get(zone_id)
        if zone is None:
            raise NotFoundError("Hosted zone not found")
        return zone

    def list(
        self, query: Optional[str], sort_by: str, descending: bool, page: int, page_size: int
    ) -> Tuple[List[HostedZone], int]:
        return self._zones.search(query, sort_by, descending, (page - 1) * page_size, page_size)

    def create(self, data: HostedZoneIn) -> HostedZone:
        """Create a zone with the apex NS and SOA records every Route 53 zone starts with."""
        zone = HostedZone(
            id=generate_id("Z"),
            name=data.name,
            description=data.description,
            type=data.type,
            created_by="Route 53",
            vpc_id=data.vpc_id,
            vpc_region=data.vpc_region,
            record_count=2,
        )
        name_servers = _generate_name_servers()
        apex_records = [
            DNSRecord(
                id=generate_id("R"), hosted_zone_id=zone.id, name=zone.name, type="NS",
                routing_policy="Simple", ttl=172800, value="\n".join(name_servers), alias=False,
            ),
            DNSRecord(
                id=generate_id("R"), hosted_zone_id=zone.id, name=zone.name, type="SOA",
                routing_policy="Simple", ttl=900, alias=False,
                value=f"{name_servers[0]} awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400",
            ),
        ]
        return self._zones.add(zone, apex_records)

    def update(self, zone_id: str, data: HostedZoneUpdate) -> HostedZone:
        zone = self.get(zone_id)
        zone.description = (data.description or "").strip() or None
        return self._zones.save(zone)

    def delete(self, zone_id: str) -> None:
        self._zones.delete(self.get(zone_id))
