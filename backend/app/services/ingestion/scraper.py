import httpx
from bs4 import BeautifulSoup
from app.core.ssrf import validate_url_for_scraping


async def scrape_url(url: str) -> str:
    validate_url_for_scraping(url)

    async with httpx.AsyncClient(
        timeout=30,
        follow_redirects=True,
        headers={"User-Agent": "Solace-Bot/1.0"},
    ) as client:
        response = await client.get(url)
        response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()

    return soup.get_text(separator="\n", strip=True)
