from abc import ABC, abstractmethod
from typing import ClassVar, List

from ..models import DNSRecord, HostedZone


class ZoneFormat(ABC):
    """A zone serialisation format. Add a subclass to support a new format."""

    name: ClassVar[str]
    extension: ClassVar[str]
    media_type: ClassVar[str]

    @abstractmethod
    def dump(self, zone: HostedZone, records: List[DNSRecord]) -> str:
        """Serialise a zone and its records to text."""

    @abstractmethod
    def parse(self, text: str, zone_name: str) -> List[dict]:
        """Parse text into raw record dicts (keys follow RecordIn). Raises ValueError when malformed."""
