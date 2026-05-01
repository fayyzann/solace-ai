"""
Supabase JWT validation supporting both HS256 (legacy) and ES256 (current default).

Supabase now issues ES256 tokens signed with a rotating JWK. We fetch the JWKS
from the well-known endpoint and cache it for 1 hour to avoid a network call on
every request.
"""
import time
import httpx
from jose import jwt, JWTError
from jose.jwk import construct as jwk_construct
from fastapi import HTTPException, status
from app.config import get_settings

settings = get_settings()

_jwks_cache: dict = {"keys": [], "fetched_at": 0.0}
_JWKS_TTL = 3600


def _get_jwks() -> list[dict]:
    now = time.time()
    if _jwks_cache["keys"] and now - _jwks_cache["fetched_at"] < _JWKS_TTL:
        return _jwks_cache["keys"]

    url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    try:
        resp = httpx.get(url, timeout=5)
        resp.raise_for_status()
        keys = resp.json()["keys"]
        _jwks_cache["keys"] = keys
        _jwks_cache["fetched_at"] = now
        return keys
    except Exception as exc:
        if _jwks_cache["keys"]:
            return _jwks_cache["keys"]  # serve stale cache on network failure
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Could not fetch Supabase JWKS: {exc}",
        )


def decode_supabase_jwt(token: str) -> dict:
    """Validate a Supabase JWT and return its payload. Supports HS256 and ES256."""
    try:
        header = jwt.get_unverified_header(token)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    alg = header.get("alg", "HS256")
    kid = header.get("kid")

    try:
        if alg == "HS256":
            if not settings.supabase_jwt_secret:
                raise HTTPException(status_code=500, detail="Supabase JWT secret not configured")
            return jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )

        # ES256 / RS256 — validate against JWKS
        keys = _get_jwks()
        jwk_dict = next((k for k in keys if k.get("kid") == kid), None)
        if not jwk_dict and keys:
            jwk_dict = keys[0]  # fall back to first key if kid not found
        if not jwk_dict:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No matching key in JWKS")

        public_key = jwk_construct(jwk_dict)
        return jwt.decode(
            token,
            public_key,
            algorithms=[alg],
            options={"verify_aud": False},
        )

    except HTTPException:
        raise
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
