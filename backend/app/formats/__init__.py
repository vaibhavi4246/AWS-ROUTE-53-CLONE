from typing import Dict

from .base import ZoneFormat
from .bind import BindFormat
from .json_format import JsonFormat


def default_formats() -> Dict[str, ZoneFormat]:
    return {fmt.name: fmt for fmt in (BindFormat(), JsonFormat())}


__all__ = ["ZoneFormat", "BindFormat", "JsonFormat", "default_formats"]
