import tempfile
import aiofiles
from pathlib import Path
from app.config import get_settings

settings = get_settings()

UPLOAD_DIR = Path(__file__).resolve().parents[3] / "uploads"
SUPABASE_BUCKET = "solace-documents"


async def save_pdf(content: bytes, tenant_id: str, source_id: str) -> str:
    """Upload PDF and return storage_path. Returns local path in dev, Supabase path in prod."""
    if settings.is_production:
        from supabase import create_client
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        path = f"{tenant_id}/{source_id}.pdf"
        client.storage.from_(SUPABASE_BUCKET).upload(
            path, content, {"content-type": "application/pdf"}
        )
        return path
    else:
        dest_dir = UPLOAD_DIR / tenant_id
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_path = dest_dir / f"{source_id}.pdf"
        async with aiofiles.open(dest_path, "wb") as f:
            await f.write(content)
        return str(dest_path)


def download_pdf_to_tempfile(storage_path: str) -> str:
    """Download PDF from storage and return path to a local temp file.

    In dev, storage_path is already a local absolute path — returns it as-is.
    In prod, downloads from Supabase and writes to a named temp file.
    """
    if not settings.is_production:
        return storage_path

    from supabase import create_client
    client = create_client(settings.supabase_url, settings.supabase_service_key)
    content: bytes = client.storage.from_(SUPABASE_BUCKET).download(storage_path)

    tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    tmp.write(content)
    tmp.close()
    return tmp.name
