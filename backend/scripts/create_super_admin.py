"""
Bootstrap the first super admin via Supabase Auth.

Creates the user in Supabase, stamps app_metadata with super_admin role,
creates the matching Tenant + User rows in our DB, then signs in and prints
a fresh access token you can use immediately.

Usage:
    python scripts/create_super_admin.py --email admin@example.com --password secret
"""
import asyncio
import argparse
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.config import get_settings

settings = get_settings()


async def provision_db(email: str, supabase_id: str, tenant_name: str, tenant_slug: str) -> tuple[Tenant, User]:
    """Create (or find) the Tenant + User rows in our database."""
    async with AsyncSessionLocal() as db:
        # Reuse tenant if slug already exists
        existing_tenant = await db.execute(select(Tenant).where(Tenant.slug == tenant_slug))
        tenant = existing_tenant.scalar_one_or_none()
        if not tenant:
            tenant = Tenant(name=tenant_name, slug=tenant_slug)
            db.add(tenant)
            await db.flush()

        # Reuse user row if supabase_id already exists
        existing_user = await db.execute(select(User).where(User.supabase_id == supabase_id))
        user = existing_user.scalar_one_or_none()
        if not user:
            user = User(
                tenant_id=tenant.id,
                email=email,
                supabase_id=supabase_id,
                hashed_password=None,
                role=UserRole.super_admin,
            )
            db.add(user)

        await db.commit()
        await db.refresh(tenant)
        await db.refresh(user)
        return tenant, user


def main(email: str, password: str, tenant_name: str, tenant_slug: str):
    if not settings.supabase_url or not settings.supabase_service_key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in backend/.env")
        sys.exit(1)

    from supabase import create_client
    sb = create_client(settings.supabase_url, settings.supabase_service_key)

    # ── 1. Create or retrieve the Supabase user ──────────────────────────────
    print(f"Looking up {email} in Supabase Auth…")
    try:
        # Try creating — Supabase raises if email already exists
        result = sb.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,   # skip confirmation email for the super admin
        })
        sb_user = result.user
        print(f"Created Supabase user: {sb_user.id}")
    except Exception as e:
        err_msg = str(e).lower()
        if "already" in err_msg or "exists" in err_msg or "registered" in err_msg:
            # User already exists — list and find by email
            users = sb.auth.admin.list_users()
            sb_user = next((u for u in users if u.email == email), None)
            if not sb_user:
                print(f"ERROR: Could not find user {email} in Supabase.")
                sys.exit(1)
            print(f"User already exists in Supabase: {sb_user.id}")
        else:
            print(f"ERROR creating Supabase user: {e}")
            sys.exit(1)

    # ── 2. Provision Tenant + User in our DB ────────────────────────────────
    print("Provisioning tenant and user in database…")
    tenant, user = asyncio.run(provision_db(email, str(sb_user.id), tenant_name, tenant_slug))
    print(f"Tenant: {tenant.name}  (id={tenant.id})")
    print(f"User:   {user.email}   (id={user.id})")

    # ── 3. Stamp app_metadata so the JWT carries role + tenant_id ───────────
    sb.auth.admin.update_user_by_id(
        str(sb_user.id),
        {"app_metadata": {"solace_role": "super_admin", "tenant_id": str(tenant.id)}},
    )
    print("app_metadata updated (solace_role=super_admin)")

    # ── 4. Sign in to get a real access token ───────────────────────────────
    print("Signing in to get access token…")
    session = sb.auth.sign_in_with_password({"email": email, "password": password})
    token = session.session.access_token

    print("\n" + "─" * 60)
    print("Super admin ready. Access token (use this in Authorization header):")
    print(f"\nBearer {token}")
    print("\n" + "─" * 60)
    print("Token is valid for ~1 hour. Re-run this script to get a fresh one.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--tenant-name", default="Solace Platform")
    parser.add_argument("--tenant-slug", default="platform")
    args = parser.parse_args()

    main(args.email, args.password, args.tenant_name, args.tenant_slug)
