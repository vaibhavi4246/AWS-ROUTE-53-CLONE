from typing import Tuple

from ..repositories.interfaces import ZoneRepository
from ..schemas import HostedZoneIn, RecordIn
from .demo_data import DEMO_ZONES
from .record_service import RecordService
from .zone_service import ZoneService


class DemoService:
    """Loads and resets the sample data behind the demo login."""

    def __init__(self, zones: ZoneRepository, zone_service: ZoneService, record_service: RecordService):
        self._zones = zones
        self._zone_service = zone_service
        self._record_service = record_service

    def seed_if_empty(self) -> bool:
        """Load the sample zones when the console has none. Returns True when data was loaded."""
        if self._zones.count() > 0:
            return False
        self._seed()
        return True

    def reset(self) -> Tuple[int, int]:
        """Replace everything with the sample data. Returns (zones, records) now present."""
        self._zones.delete_all()
        return self._seed()

    def _seed(self) -> Tuple[int, int]:
        record_total = 0
        for definition in DEMO_ZONES:
            zone = self._zone_service.create(
                HostedZoneIn(
                    name=definition["name"],
                    description=definition.get("description"),
                    type=definition.get("type", "Public"),
                    vpc_id=definition.get("vpc_id"),
                    vpc_region=definition.get("vpc_region"),
                )
            )
            for record in definition["records"]:
                self._record_service.create(zone.id, RecordIn(**record))
                record_total += 1
        return len(DEMO_ZONES), record_total
