from typing import List, Optional, Tuple

from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session

from ..models import DNSRecord, HostedZone, User

ZONE_SORT_COLUMNS = {
    "name": HostedZone.name,
    "type": HostedZone.type,
    "created_by": HostedZone.created_by,
    "record_count": HostedZone.record_count,
    "description": HostedZone.description,
    "id": HostedZone.id,
}

RECORD_SORT_COLUMNS = {
    "name": DNSRecord.name,
    "type": DNSRecord.type,
    "routing_policy": DNSRecord.routing_policy,
    "ttl": DNSRecord.ttl,
    "value": DNSRecord.value,
}


def _like(query: str) -> str:
    escaped = query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


class SqlAlchemyUserRepository:
    def __init__(self, db: Session):
        self._db = db

    def get_by_username(self, username: str) -> Optional[User]:
        return self._db.query(User).filter(User.username == username).first()

    def add(self, user: User) -> User:
        self._db.add(user)
        self._db.commit()
        self._db.refresh(user)
        return user

    def save(self, user: User) -> User:
        self._db.commit()
        self._db.refresh(user)
        return user


class SqlAlchemyZoneRepository:
    def __init__(self, db: Session):
        self._db = db

    def get(self, zone_id: str) -> Optional[HostedZone]:
        return self._db.get(HostedZone, zone_id)

    def search(
        self, query: Optional[str], sort_by: str, descending: bool, offset: int, limit: int
    ) -> Tuple[List[HostedZone], int]:
        statement = self._db.query(HostedZone)
        if query:
            pattern = _like(query.strip())
            statement = statement.filter(
                or_(
                    HostedZone.name.ilike(pattern, escape="\\"),
                    HostedZone.description.ilike(pattern, escape="\\"),
                    HostedZone.id.ilike(pattern, escape="\\"),
                    HostedZone.type.ilike(pattern, escape="\\"),
                )
            )
        total = statement.count()
        column = ZONE_SORT_COLUMNS.get(sort_by, HostedZone.name)
        ordering = column.desc() if descending else column.asc()
        items = statement.order_by(ordering, HostedZone.id).offset(offset).limit(limit).all()
        return items, total

    def add(self, zone: HostedZone, records: List[DNSRecord]) -> HostedZone:
        self._db.add(zone)
        self._db.add_all(records)
        self._db.commit()
        self._db.refresh(zone)
        return zone

    def save(self, zone: HostedZone) -> HostedZone:
        self._db.commit()
        self._db.refresh(zone)
        return zone

    def delete(self, zone: HostedZone) -> None:
        self._db.delete(zone)
        self._db.commit()

    def count(self) -> int:
        return self._db.query(func.count(HostedZone.id)).scalar() or 0

    def delete_all(self) -> int:
        """Remove every zone (records cascade). Returns how many zones were deleted."""
        zones = self._db.query(HostedZone).all()
        for zone in zones:
            self._db.delete(zone)
        self._db.commit()
        return len(zones)


class SqlAlchemyRecordRepository:
    def __init__(self, db: Session):
        self._db = db

    def get(self, zone_id: str, record_id: str) -> Optional[DNSRecord]:
        return (
            self._db.query(DNSRecord)
            .filter(DNSRecord.hosted_zone_id == zone_id, DNSRecord.id == record_id)
            .first()
        )

    def search(
        self,
        zone_id: str,
        query: Optional[str],
        record_type: Optional[str],
        sort_by: Optional[str],
        descending: bool,
        offset: int,
        limit: int,
    ) -> Tuple[List[DNSRecord], int]:
        statement = self._db.query(DNSRecord).filter(DNSRecord.hosted_zone_id == zone_id)
        if record_type:
            statement = statement.filter(DNSRecord.type == record_type)
        if query:
            pattern = _like(query.strip())
            statement = statement.filter(
                or_(
                    DNSRecord.name.ilike(pattern, escape="\\"),
                    DNSRecord.value.ilike(pattern, escape="\\"),
                    DNSRecord.alias_target.ilike(pattern, escape="\\"),
                )
            )
        total = statement.count()

        if sort_by in RECORD_SORT_COLUMNS:
            column = RECORD_SORT_COLUMNS[sort_by]
            ordering = [column.desc() if descending else column.asc(), DNSRecord.type, DNSRecord.id]
        else:
            # Default view, like the real console: every apex record first (NS, then SOA, then the rest
            # by type), followed by the subdomains alphabetically. Weighted siblings order by record ID.
            apex_first = case((DNSRecord.name == HostedZone.name, 0), else_=1)
            managed_first = case(
                ((DNSRecord.name == HostedZone.name) & (DNSRecord.type == "NS"), 0),
                ((DNSRecord.name == HostedZone.name) & (DNSRecord.type == "SOA"), 1),
                else_=2,
            )
            statement = statement.join(HostedZone, HostedZone.id == DNSRecord.hosted_zone_id)
            ordering = [apex_first, managed_first, DNSRecord.name, DNSRecord.type, DNSRecord.set_id, DNSRecord.id]
        items = statement.order_by(*ordering).offset(offset).limit(limit).all()
        return items, total

    def list_all(self, zone_id: str) -> List[DNSRecord]:
        return (
            self._db.query(DNSRecord)
            .filter(DNSRecord.hosted_zone_id == zone_id)
            .order_by(DNSRecord.name, DNSRecord.type)
            .all()
        )

    def find_by_name(self, zone_id: str, name: str) -> List[DNSRecord]:
        return (
            self._db.query(DNSRecord)
            .filter(DNSRecord.hosted_zone_id == zone_id, DNSRecord.name == name)
            .all()
        )

    def add(self, record: DNSRecord) -> DNSRecord:
        self._db.add(record)
        self._db.flush()
        self._sync_count(record.hosted_zone_id)
        self._db.commit()
        self._db.refresh(record)
        return record

    def save(self, record: DNSRecord) -> DNSRecord:
        self._db.commit()
        self._db.refresh(record)
        return record

    def delete_many(self, zone_id: str, records: List[DNSRecord]) -> None:
        for record in records:
            self._db.delete(record)
        self._db.flush()
        self._sync_count(zone_id)
        self._db.commit()

    def _sync_count(self, zone_id: str) -> None:
        """Keep the denormalised zone.record_count equal to the real row count."""
        count = self._db.query(func.count(DNSRecord.id)).filter(DNSRecord.hosted_zone_id == zone_id).scalar()
        self._db.query(HostedZone).filter(HostedZone.id == zone_id).update({"record_count": count})
