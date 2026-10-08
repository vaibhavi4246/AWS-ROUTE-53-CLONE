from fastapi import APIRouter, Depends, File, Query, Response, UploadFile

from ..core.errors import DomainValidationError
from ..schemas import ImportResult
from ..services import TransferService
from .deps import get_current_user, get_transfer_service

router = APIRouter(
    prefix="/api/hosted-zones/{zone_id}", tags=["import / export"], dependencies=[Depends(get_current_user)]
)

MAX_IMPORT_BYTES = 1_000_000


@router.post("/import", response_model=ImportResult)
def import_zone(
    zone_id: str,
    format: str = Query("bind"),
    file: UploadFile = File(...),
    transfer: TransferService = Depends(get_transfer_service),
):
    raw = file.file.read(MAX_IMPORT_BYTES + 1)
    if len(raw) > MAX_IMPORT_BYTES:
        raise DomainValidationError("Import file is larger than 1 MB.")
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise DomainValidationError("Import file must be UTF-8 text.") from exc
    return transfer.import_records(zone_id, text, format)


@router.get("/export")
def export_zone(zone_id: str, format: str = Query("bind"), transfer: TransferService = Depends(get_transfer_service)):
    content, fmt, filename = transfer.export(zone_id, format)
    return Response(
        content=content,
        media_type=fmt.media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
