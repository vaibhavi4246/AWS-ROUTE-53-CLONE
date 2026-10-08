from datetime import datetime
from typing import Generic, List, Literal, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .core.dns_names import is_valid_domain, to_fqdn

RecordType = Literal["A", "AAAA", "CNAME", "MX", "NS", "PTR", "SRV", "TXT", "CAA"]
RoutingPolicy = Literal["Simple", "Weighted"]
ZoneType = Literal["Public", "Private"]
SortDirection = Literal["asc", "desc"]

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    """Envelope returned by every list endpoint."""

    items: List[T]
    total: int
    page: int
    page_size: int


# ---- Auth -------------------------------------------------------------------

class UserLogin(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    aws_account_id: str
    is_demo: bool = False


class DemoLoginOut(BaseModel):
    token: str
    user: UserOut
    seeded: bool


class DemoResetOut(BaseModel):
    zones: int
    records: int


# ---- Hosted zones -----------------------------------------------------------

class HostedZoneIn(BaseModel):
    name: str
    description: Optional[str] = Field(None, max_length=256)
    type: ZoneType = "Public"
    vpc_id: Optional[str] = None
    vpc_region: Optional[str] = None

    @field_validator("name")
    @classmethod
    def _valid_zone_name(cls, value: str) -> str:
        if not is_valid_domain(value, zone_name=True):
            raise ValueError(
                "Domain name must contain only a-z, 0-9 and hyphens; each label up to 63 characters."
            )
        return to_fqdn(value)

    @model_validator(mode="after")
    def _private_needs_vpc(self) -> "HostedZoneIn":
        if self.type == "Private":
            if not (self.vpc_id and self.vpc_id.strip()):
                raise ValueError("A VPC ID is required for private hosted zones.")
            if not (self.vpc_region and self.vpc_region.strip()):
                raise ValueError("A VPC region is required for private hosted zones.")
        else:
            self.vpc_id = None
            self.vpc_region = None
        return self


class HostedZoneUpdate(BaseModel):
    description: Optional[str] = Field(None, max_length=256)


class HostedZoneOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: Optional[str] = None
    type: str
    created_by: Optional[str] = "Route 53"
    vpc_id: Optional[str] = None
    vpc_region: Optional[str] = None
    record_count: int
    created_at: datetime


# ---- DNS records ------------------------------------------------------------

class RecordIn(BaseModel):
    """Create/replace payload for a DNS record. Value rules per type live in the validators package."""

    name: str = Field("", max_length=255)
    type: RecordType
    routing_policy: RoutingPolicy = "Simple"
    ttl: int = Field(300, ge=0, le=2147483647)
    value: str = Field("", max_length=8192)
    weight: Optional[int] = Field(None, ge=0, le=255)
    set_id: Optional[str] = Field(None, max_length=128)
    alias: bool = False
    alias_target: Optional[str] = Field(None, max_length=255)
    health_check_id: Optional[str] = None

    @model_validator(mode="after")
    def _consistency(self) -> "RecordIn":
        if self.routing_policy == "Weighted":
            if self.weight is None:
                raise ValueError("Weight is required for weighted routing.")
            if not (self.set_id and self.set_id.strip()):
                raise ValueError("Record ID is required for weighted routing.")
        else:
            self.weight = None
            self.set_id = None

        if self.alias:
            if not (self.alias_target and self.alias_target.strip()):
                raise ValueError("Alias target is required for alias records.")
        else:
            self.alias_target = None
            if not self.value.strip():
                raise ValueError("Record value is required.")
        return self


class RecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    hosted_zone_id: str
    name: str
    type: str
    routing_policy: str
    ttl: int
    value: str
    weight: Optional[int] = None
    set_id: Optional[str] = None
    alias: bool
    alias_target: Optional[str] = None
    health_check_id: Optional[str] = None
    created_at: datetime


class BulkDeleteIn(BaseModel):
    record_ids: List[str] = Field(min_length=1)


class BulkDeleteOut(BaseModel):
    deleted_count: int
    skipped_count: int


class SkippedRecord(BaseModel):
    name: str
    type: str
    reason: str


class ImportResult(BaseModel):
    imported_count: int
    skipped: List[SkippedRecord]
