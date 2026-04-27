from pathlib import Path
import pypdf


def extract_text_from_pdf(path: str | Path) -> str:
    reader = pypdf.PdfReader(str(path))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n\n".join(p.strip() for p in pages if p.strip())
