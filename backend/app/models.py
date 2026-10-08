import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base


def _utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    aws_account_id = Column(String, default="1234-5678-9012")


class HostedZone(Base):
    __tablename__ = "hosted_zones"

    id = Column(String, primary_key=True, index=True)  # Z[0-9A-Z]{13}
    name = Column(String, nullable=False, index=True)  # e.g. example.com.
    description = Column(String, nullable=True)
    type = Column(String, default="Public")  # Public | Private
    created_by = Column(String, default="Route 53")
    vpc_id = Column(String, nullable=True)
    vpc_region = Column(String, nullable=True)
    record_count = Column(Integer, default=2)
    created_at = Column(DateTime, default=_utcnow)

    records = relationship("DNSRecord", back_populates="zone", cascade="all, delete-orphan")


class DNSRecord(Base):
    __tablename__ = "dns_records"
    __table_args__ = (Index("ix_dns_records_zone_name_type", "hosted_zone_id", "name", "type"),)

    id = Column(String, primary_key=True, index=True)  # R[0-9A-Z]{13}
    hosted_zone_id = Column(String, ForeignKey("hosted_zones.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)  # absolute, e.g. www.example.com.
    type = Column(String, nullable=False)
    routing_policy = Column(String, default="Simple")  # Simple | Weighted
    ttl = Column(Integer, default=300)
    value = Column(Text, nullable=False, default="")  # newline-separated values
    weight = Column(Integer, nullable=True)
    set_id = Column(String, nullable=True)
    alias = Column(Boolean, default=False)
    alias_target = Column(String, nullable=True)
    health_check_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=_utcnow)

    zone = relationship("HostedZone", back_populates="records")
