import ipaddress
import socket
from urllib.parse import urlparse
from fastapi import HTTPException, status

BLOCKED_HOSTS = {"localhost", "0.0.0.0"}
ALLOWED_SCHEMES = {"http", "https"}


def validate_url_for_scraping(url: str) -> str:
    parsed = urlparse(url)

    if parsed.scheme not in ALLOWED_SCHEMES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="URL scheme not allowed")

    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid URL")

    if hostname in BLOCKED_HOSTS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="URL not allowed")

    try:
        ip = ipaddress.ip_address(hostname)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="URL not allowed")
    except ValueError:
        # hostname is a domain name — resolve and check
        try:
            resolved = socket.getaddrinfo(hostname, None)
            for *_, sockaddr in resolved:
                ip = ipaddress.ip_address(sockaddr[0])
                if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="URL not allowed")
        except socket.gaierror:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="URL could not be resolved")

    return url
