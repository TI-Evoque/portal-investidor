import re
from pathlib import Path
from uuid import uuid4


def safe_filename(original_name: str) -> str:
    suffix = Path(original_name).suffix.lower()
    stem = Path(original_name).stem.lower()
    clean_stem = re.sub(r'[^a-zA-Z0-9_-]+', '-', stem).strip('-') or 'arquivo'
    return f'{clean_stem}-{uuid4().hex[:10]}{suffix}'
