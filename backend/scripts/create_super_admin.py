"""
One-time script to bootstrap the first super admin user.

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
from app.core.security import hash_password, create_access_token


async def main(email: str, password: str, tenant_name: str, tenant_slug: str):
    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(User).where(User.email == email))
        existing_user = existing.scalar_one_or_none()
        if existing_user:
            token = create_access_token(
                str(existing_user.id), existing_user.role.value, str(existing_user.tenant_id)
            )
            print(f"User {email} already exists — issuing a fresh token.")
            print(f"\nAccess token (valid 15 min):\n{token}")
            return

        existing_tenant = await db.execute(
            select(Tenant).where(Tenant.slug == tenant_slug)
        )
        tenant = existing_tenant.scalar_one_or_none()
        if not tenant:
            tenant = Tenant(name=tenant_name, slug=tenant_slug)
            db.add(tenant)
            await db.flush()

        user = User(
            tenant_id=tenant.id,
            email=email,
            hashed_password=hash_password(password),
            role=UserRole.super_admin,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        token = create_access_token(str(user.id), user.role.value, str(user.tenant_id))
        print(f"Super admin created: {email}")
        print(f"Tenant: {tenant.name} (id={tenant.id})")
        print(f"\nAccess token (valid 15 min):\n{token}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--tenant-name", default="Solace Platform")
    parser.add_argument("--tenant-slug", default="platform")
    args = parser.parse_args()

    asyncio.run(main(args.email, args.password, args.tenant_name, args.tenant_slug))
