from typing import Dict, List, Tuple

from pydantic import ValidationError

from ..core.errors import DomainError, DomainValidationError, NotFoundError
from ..formats import ZoneFormat
from ..repositories.interfaces import RecordRepository, ZoneRepository
from ..schemas import ImportResult, RecordIn, SkippedRecord
from .record_service import RecordService


class TransferService:
    """Import and export zones through pluggable formats."""

    def __init__(
        self,
        zones: ZoneRepository,
        records: RecordRepository,
        record_service: RecordService,
        formats: Dict[str, ZoneFormat],
    ):
        self._zones = zones
        self._records = records
        self._record_service = record_service
        self._formats = formats

    def _format(self, name: str) -> ZoneFormat:
        fmt = self._formats.get(name)
        if fmt is None:
            raise DomainValidationError(f"Unsupported format '{name}'. Use one of: {', '.join(sorted(self._formats))}.")
        return fmt

    def export(self, zone_id: str, format_name: str) -> Tuple[str, ZoneFormat, str]:
        fmt = self._format(format_name)
        zone = self._zones.get(zone_id)
        if zone is None:
            raise NotFoundError("Hosted zone not found")
        content = fmt.dump(zone, self._records.list_all(zone_id))
        return content, fmt, f"{zone.name.rstrip('.')}.{fmt.extension}"

    def import_records(self, zone_id: str, text: str, format_name: str) -> ImportResult:
        fmt = self._format(format_name)
        zone = self._zones.get(zone_id)
        if zone is None:
            raise NotFoundError("Hosted zone not found")
        try:
            raw_records = fmt.parse(text, zone.name)
        except ValueError as exc:
            raise DomainValidationError(str(exc)) from exc

        imported = 0
        skipped: List[SkippedRecord] = []
        for raw in raw_records:
            name, record_type = str(raw.get("name", "")), str(raw.get("type", ""))
            if record_type == "SOA":
                skipped.append(SkippedRecord(name=name, type=record_type, reason="SOA records are managed by Route 53"))
                continue
            try:
                self._record_service.create(zone_id, RecordIn(**raw))
                imported += 1
            except ValidationError as exc:
                message = exc.errors()[0]["msg"].removeprefix("Value error, ")
                skipped.append(SkippedRecord(name=name, type=record_type, reason=message))
            except DomainError as exc:
                skipped.append(SkippedRecord(name=name, type=record_type, reason=exc.message))
        return ImportResult(imported_count=imported, skipped=skipped)
