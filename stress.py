#!/usr/bin/env python3
"""
Solace AI — stress test suite.

Hammers four endpoints concurrently and prints a latency/error report.

Usage (activate venv first):
  source backend/.venv/bin/activate
  python stress.py --email owner@acme.dev --password pass1234

Flags:
  --base-url      default: http://localhost:8000
  --concurrency   parallel workers for non-LLM scenarios (default: 20)
  --requests      total requests per non-LLM scenario (default: 100)
  --chat-requests total chat/stream requests (default: 10 — LLM rate limits)
  --chat-concurrency parallel chat streams (default: 5)
"""
import asyncio
import argparse
import json
import statistics
import sys
import time
from dataclasses import dataclass, field

try:
    import httpx
except ImportError:
    sys.exit("httpx not found — run: source backend/.venv/bin/activate")

# ── result types ──────────────────────────────────────────────────────────────

@dataclass
class Result:
    ok: bool
    latency_ms: float
    status: int = 0
    error: str = ""


@dataclass
class Scenario:
    name: str
    results: list[Result] = field(default_factory=list)

    def add(self, r: Result) -> None:
        self.results.append(r)

    def _pct(self, sorted_lat: list[float], p: int) -> float:
        if not sorted_lat:
            return 0.0
        idx = max(0, int(len(sorted_lat) * p / 100) - 1)
        return sorted_lat[idx]

    def print_report(self) -> None:
        ok = [r for r in self.results if r.ok]
        fail = [r for r in self.results if not r.ok]
        lat = sorted(r.latency_ms for r in ok)
        total = len(self.results)

        status_label = "\033[32mOK\033[0m" if not fail else f"\033[31mDEGRADED\033[0m"
        print(f"\n  \033[1m{self.name}\033[0m  [{status_label}]")
        print(f"    requests  : {total}  ok={len(ok)}  fail={len(fail)}")
        if lat:
            print(
                f"    latency   : "
                f"min={min(lat):.0f}ms  "
                f"avg={statistics.mean(lat):.0f}ms  "
                f"p95={self._pct(lat, 95):.0f}ms  "
                f"p99={self._pct(lat, 99):.0f}ms  "
                f"max={max(lat):.0f}ms"
            )
        if fail:
            counts: dict[str, int] = {}
            for r in fail:
                counts[r.error] = counts.get(r.error, 0) + 1
            for msg, n in counts.items():
                print(f"    \033[31merror\033[0m     : {msg} ({n}x)")


# ── individual request fns ────────────────────────────────────────────────────

async def do_login(client: httpx.AsyncClient, email: str, password: str) -> Result:
    t = time.perf_counter()
    try:
        r = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
        ms = (time.perf_counter() - t) * 1000
        ok = r.status_code == 200
        return Result(ok=ok, latency_ms=ms, status=r.status_code,
                      error="" if ok else f"HTTP {r.status_code}")
    except Exception as e:
        return Result(ok=False, latency_ms=(time.perf_counter() - t) * 1000, error=str(e)[:80])


async def do_knowledge_list(client: httpx.AsyncClient, token: str) -> Result:
    t = time.perf_counter()
    try:
        r = await client.get("/api/v1/knowledge/",
                             headers={"Authorization": f"Bearer {token}"})
        ms = (time.perf_counter() - t) * 1000
        ok = r.status_code == 200
        return Result(ok=ok, latency_ms=ms, status=r.status_code,
                      error="" if ok else f"HTTP {r.status_code}")
    except Exception as e:
        return Result(ok=False, latency_ms=(time.perf_counter() - t) * 1000, error=str(e)[:80])


async def do_analytics(client: httpx.AsyncClient, token: str) -> Result:
    t = time.perf_counter()
    try:
        r = await client.get("/api/v1/analytics/summary",
                             headers={"Authorization": f"Bearer {token}"})
        ms = (time.perf_counter() - t) * 1000
        ok = r.status_code == 200
        return Result(ok=ok, latency_ms=ms, status=r.status_code,
                      error="" if ok else f"HTTP {r.status_code}")
    except Exception as e:
        return Result(ok=False, latency_ms=(time.perf_counter() - t) * 1000, error=str(e)[:80])


async def do_chat_stream(client: httpx.AsyncClient, widget_token: str) -> Result:
    t = time.perf_counter()
    try:
        async with client.stream(
            "POST",
            "/api/v1/chat/stream",
            headers={
                "Authorization": f"Bearer {widget_token}",
                "Content-Type": "application/json",
            },
            json={"message": "What services do you provide?", "visitor_id": "stress-test"},
            timeout=90.0,
        ) as r:
            if r.status_code != 200:
                ms = (time.perf_counter() - t) * 1000
                return Result(ok=False, latency_ms=ms, status=r.status_code,
                              error=f"HTTP {r.status_code}")
            error_seen = False
            async for line in r.aiter_lines():
                if not line.startswith("data: "):
                    continue
                event = json.loads(line[6:])
                if event.get("type") == "error":
                    error_seen = True
                if event.get("type") == "done":
                    break

        ms = (time.perf_counter() - t) * 1000
        return Result(ok=not error_seen, latency_ms=ms, status=200,
                      error="stream returned error event" if error_seen else "")
    except Exception as e:
        return Result(ok=False, latency_ms=(time.perf_counter() - t) * 1000, error=str(e)[:80])


# ── concurrency runner ────────────────────────────────────────────────────────

async def run_scenario(name: str, coro_fn, total: int, concurrency: int) -> Scenario:
    scenario = Scenario(name)
    sem = asyncio.Semaphore(concurrency)

    async def one() -> None:
        async with sem:
            scenario.add(await coro_fn())

    print(f"  {name:<40} {total} req @ {concurrency} concurrent … ", end="", flush=True)
    t0 = time.perf_counter()
    await asyncio.gather(*[one() for _ in range(total)])
    elapsed = time.perf_counter() - t0
    print(f"{elapsed:.1f}s  ({total / elapsed:.1f} rps)")
    return scenario


# ── main ──────────────────────────────────────────────────────────────────────

async def main(args: argparse.Namespace) -> None:
    base = args.base_url

    # ── authenticate ────────────────────────────────────────────────────────
    print("\n\033[1mAuthenticating…\033[0m")
    async with httpx.AsyncClient(base_url=base, timeout=30.0) as client:
        r = await client.post("/api/v1/auth/login",
                              json={"email": args.email, "password": args.password})
        if r.status_code != 200:
            sys.exit(f"Login failed ({r.status_code}): {r.text}")
        admin_token = r.json()["access_token"]

        r2 = await client.post("/api/v1/widget/token",
                               headers={"Authorization": f"Bearer {admin_token}"})
        if r2.status_code != 200:
            sys.exit(f"Widget token failed ({r2.status_code}): {r2.text}")
        widget_token = r2.json()["token"]

    print(f"  admin token  : {admin_token[:48]}…")
    print(f"  widget token : {widget_token[:48]}…")

    n, c = args.requests, args.concurrency
    chat_n, chat_c = args.chat_requests, args.chat_concurrency

    print(f"\n\033[1mRunning scenarios…\033[0m")
    print(f"  non-LLM : {n} requests @ {c} concurrent")
    print(f"  chat    : {chat_n} requests @ {chat_c} concurrent\n")

    limits = httpx.Limits(max_connections=max(c, chat_c) + 10,
                          max_keepalive_connections=max(c, chat_c))

    t_wall = time.perf_counter()
    scenarios: list[Scenario] = []

    async with httpx.AsyncClient(base_url=base, timeout=90.0, limits=limits) as client:

        scenarios.append(await run_scenario(
            "POST /api/v1/auth/login",
            lambda: do_login(client, args.email, args.password),
            n, c,
        ))

        scenarios.append(await run_scenario(
            "GET  /api/v1/knowledge/",
            lambda: do_knowledge_list(client, admin_token),
            n, c,
        ))

        scenarios.append(await run_scenario(
            "GET  /api/v1/analytics/summary",
            lambda: do_analytics(client, admin_token),
            n, c,
        ))

        scenarios.append(await run_scenario(
            "POST /api/v1/chat/stream  (SSE+LLM)",
            lambda: do_chat_stream(client, widget_token),
            chat_n, chat_c,
        ))

    wall = time.perf_counter() - t_wall
    total_req = sum(len(s.results) for s in scenarios)
    total_ok  = sum(sum(1 for r in s.results if r.ok) for s in scenarios)
    total_fail = total_req - total_ok

    print(f"\n{'─' * 60}")
    print("\033[1mRESULTS\033[0m")
    print(f"{'─' * 60}")
    for s in scenarios:
        s.print_report()

    print(f"\n  wall time     : {wall:.1f}s")
    print(f"  total         : {total_req} req  ok={total_ok}  fail={total_fail}")
    print(f"  overall RPS   : {total_req / wall:.1f}")
    print(f"{'─' * 60}\n")

    if total_fail:
        sys.exit(1)


if __name__ == "__main__":
    p = argparse.ArgumentParser(description="Solace stress test")
    p.add_argument("--base-url",          default="http://localhost:8000")
    p.add_argument("--email",             required=True)
    p.add_argument("--password",          required=True)
    p.add_argument("--concurrency",       type=int, default=20)
    p.add_argument("--requests",          type=int, default=100)
    p.add_argument("--chat-requests",     type=int, default=10)
    p.add_argument("--chat-concurrency",  type=int, default=5)
    asyncio.run(main(p.parse_args()))
