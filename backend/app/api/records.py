from typing import Optional

from fastapi import APIRouter, Depends, Query, Response, status

from ..schemas import BulkDeleteIn, BulkDeleteOut, Page, RecordIn, RecordOut, SortDirection
from ..services import RecordService
from .deps import get_current_user, get_record_service

router = APIRouter(
    prefix="/api/hosted-zones/{zone_id}/records", tags=["records"], dependencies=[Depends(get_current_user)]
)


@router.get("", response_model=Page[RecordOut])
def list_records(
    zone_id: str,
    query: Optional[str] = None,
    type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort_by: Optional[str] = None,
    sort_dir: SortDirection = "asc",
    records: RecordService = Depends(get_record_service),
):
    items, total = records.list(zone_id, query, type, sort_by, sort_dir == "desc", page, page_size)
    return Page[RecordOut](
        items=[RecordOut.model_validate(r) for r in items], total=total, page=page, page_size=page_size
    )


@router.get("/{record_id}", response_model=RecordOut)
def get_record(zone_id: str, record_id: str, records: RecordService = Depends(get_record_service)):
    return records.get(zone_id, record_id)


@router.post("", response_model=RecordOut, status_code=status.HTTP_201_CREATED)
def create_record(zone_id: str, data: RecordIn, records: RecordService = Depends(get_record_service)):
    return records.create(zone_id, data)


@router.post("/bulk-delete", response_model=BulkDeleteOut)
def bulk_delete_records(zone_id: str, data: BulkDeleteIn, records: RecordService = Depends(get_record_service)):
    deleted, skipped = records.bulk_delete(zone_id, data.record_ids)
    return BulkDeleteOut(deleted_count=deleted, skipped_count=skipped)


@router.put("/{record_id}", response_model=RecordOut)
def update_record(
    zone_id: str, record_id: str, data: RecordIn, records: RecordService = Depends(get_record_service)
):
    return records.update(zone_id, record_id, data)


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(zone_id: str, record_id: str, records: RecordService = Depends(get_record_service)):
    records.delete(zone_id, record_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
