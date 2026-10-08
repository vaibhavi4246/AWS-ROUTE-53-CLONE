from typing import Optional

from fastapi import APIRouter, Depends, Query, Response, status

from ..schemas import HostedZoneIn, HostedZoneOut, HostedZoneUpdate, Page, SortDirection
from ..services import ZoneService
from .deps import get_current_user, get_zone_service

router = APIRouter(prefix="/api/hosted-zones", tags=["hosted zones"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=Page[HostedZoneOut])
def list_hosted_zones(
    query: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort_by: str = "name",
    sort_dir: SortDirection = "asc",
    zones: ZoneService = Depends(get_zone_service),
):
    items, total = zones.list(query, sort_by, sort_dir == "desc", page, page_size)
    return Page[HostedZoneOut](
        items=[HostedZoneOut.model_validate(z) for z in items], total=total, page=page, page_size=page_size
    )


@router.post("", response_model=HostedZoneOut, status_code=status.HTTP_201_CREATED)
def create_hosted_zone(data: HostedZoneIn, zones: ZoneService = Depends(get_zone_service)):
    return zones.create(data)


@router.get("/{zone_id}", response_model=HostedZoneOut)
def get_hosted_zone(zone_id: str, zones: ZoneService = Depends(get_zone_service)):
    return zones.get(zone_id)


@router.put("/{zone_id}", response_model=HostedZoneOut)
def update_hosted_zone(zone_id: str, data: HostedZoneUpdate, zones: ZoneService = Depends(get_zone_service)):
    return zones.update(zone_id, data)


@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hosted_zone(zone_id: str, zones: ZoneService = Depends(get_zone_service)):
    zones.delete(zone_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
