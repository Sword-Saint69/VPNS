#!/usr/bin/env python3
"""
vpn_check — liveness-check a list of proxy URIs (vless/vmess/trojan/ss/...).

For each proxy URI it extracts host:port and attempts a TCP connect with a
timeout. Reachable = alive, unreachable/timed-out = dead. Writes:

    out/alive.txt        — working proxy URIs
    out/dead.txt         — unreachable proxy URIs
    out/summary.json     — per-protocol / overall stats

Usage:
    python3 vpn_check.py [input.txt] [--out out] [--timeout 4] [--workers 200]

input defaults to vpn_sorted/all_dedupe.txt if present, else reads stdin or
a single positional file.
"""

from __future__ import annotations

import json
import re
import socket
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import base64

DEFAULT_INPUT = "vpn_sorted/all_dedupe.txt"
DEFAULT_OUT = "vpn_checked"
DEFAULT_TIMEOUT = 4
DEFAULT_WORKERS = 200

URI_RE = re.compile(
    r"^(?P<proto>vless|vmess|trojan|ss|ssr|hysteria2|hy2|tuic|wireguard)://"
    r"(?:[^@#]+@)?"
    r"\[?(?P<host>[^\]:#/]+)\]?"
    r":(?P<port>\d+)",
    re.I,
)


def set_remark(line: str, remark: str) -> str:
    """Replace the fragment (#remark) on a proxy URI with `remark`."""
    line = line.rstrip("\n")
    m = URI_RE.match(line)
    if m and m.group("proto").lower() == "vmess":
        payload = line[len("vmess://"):]
        hash_i = payload.find("#")
        if hash_i != -1:
            payload = payload[:hash_i]
        try:
            pad = "=" * (-len(payload) % 4)
            dec = base64.b64decode(payload + pad, validate=False).decode("utf-8", errors="ignore")
            cfg = json.loads(dec)
            cfg["ps"] = remark
            new_payload = base64.b64encode(
                json.dumps(cfg, separators=(",", ":")).encode()
            ).decode()
            return "vmess://" + new_payload + "#" + remark
        except Exception:
            pass
    hash_i = line.find("#")
    if hash_i != -1:
        return line[:hash_i + 1] + remark
    return line + "#" + remark


def parse_proxy(line: str) -> Optional[Tuple[str, str, int]]:
    """Return (proto, host, port) or None."""
    line = line.strip()
    if not line:
        return None
    m = URI_RE.match(line)
    if not m:
        return None
    proto = m.group("proto").lower()
    host = m.group("host")
    port = int(m.group("port"))
    if proto == "vmess":
        # vmess://<base64 json> — get real host/port from payload
        payload = line[len("vmess://"):]
        # strip remark
        hash_i = payload.find("#")
        if hash_i != -1:
            payload = payload[:hash_i]
        try:
            pad = "=" * (-len(payload) % 4)
            dec = base64.b64decode(payload + pad, validate=False).decode("utf-8", errors="ignore")
            import json as _json
            cfg = _json.loads(dec)
            host = str(cfg.get("add", host))
            port = int(cfg.get("port", port))
        except Exception:
            pass
    return proto, host, port


def check_one(line: str, timeout: float) -> Dict:
    parsed = parse_proxy(line)
    result: Dict = {"line": line, "alive": False, "proto": None, "host": None,
                    "port": None, "error": None}
    if not parsed:
        result["error"] = "unparseable"
        return result
    proto, host, port = parsed
    result["proto"] = proto
    result["host"] = host
    result["port"] = port
    try:
        sock = socket.create_connection((host, port), timeout=timeout)
        sock.settimeout(timeout)
        # optional tiny TLS probe for common ports; not required for liveness
        sock.close()
        result["alive"] = True
    except Exception as exc:  # noqa: BLE001
        result["alive"] = False
        result["error"] = type(exc).__name__
    return result


def read_input(source: str) -> List[str]:
    lines: List[str] = []
    p = Path(source)
    if p.exists():
        lines = p.read_text(encoding="utf-8").splitlines()
    else:
        lines = [source]
    out: List[str] = []
    seen = set()
    for l in lines:
        l = l.strip()
        if not l or l.startswith("#"):
            continue
        if l not in seen:
            seen.add(l)
            out.append(l)
    return out


def main(argv: Optional[List[str]] = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    input_file = DEFAULT_INPUT
    out = Path(DEFAULT_OUT)
    timeout = DEFAULT_TIMEOUT
    workers = DEFAULT_WORKERS
    remark = None

    i = 0
    quiet = False
    while i < len(args):
        a = args[i]
        if a.startswith("--"):
            if a == "--out" and i + 1 < len(args):
                out = Path(args[i + 1]); i += 2
            elif a == "--timeout" and i + 1 < len(args):
                timeout = float(args[i + 1]); i += 2
            elif a == "--workers" and i + 1 < len(args):
                workers = int(args[i + 1]); i += 2
            elif a in ("--quiet", "-q"):
                quiet = True; i += 1
            elif a == "--remark" and i + 1 < len(args):
                remark = args[i + 1]; i += 2
            else:
                i += 1
        else:
            input_file = a
            i += 1

    lines = read_input(input_file)
    if remark:
        lines = [set_remark(l, remark) for l in lines]
    if not lines:
        print("No lines to check.", file=sys.stderr)
        return 1

    alive: List[Dict] = []
    dead: List[Dict] = []
    total = len(lines)
    done = 0

    def draw() -> None:
        rate = (len(alive) / done * 100) if done else 0.0
        line = (
            f"\rchecking {done}/{total}  alive={len(alive)}  dead={len(dead)}  "
            f"alive_rate={rate:.1f}%"
        )
        sys.stdout.write(line)
        sys.stdout.flush()

    if not quiet:
        draw()
    with ThreadPoolExecutor(max_workers=workers) as ex:
        fut_map = {ex.submit(check_one, l, timeout): l for l in lines}
        for fut in as_completed(fut_map):
            r = fut.result()
            done += 1
            (alive if r["alive"] else dead).append(r)
            if not quiet:
                draw()
    if not quiet:
        sys.stdout.write("\n")
        sys.stdout.flush()

    out.mkdir(parents=True, exist_ok=True)
    (out / "alive.txt").write_text(
        "\n".join(r["line"] for r in alive) + ("\n" if alive else ""), encoding="utf-8")
    (out / "dead.txt").write_text(
        "\n".join(r["line"] for r in dead) + ("\n" if dead else ""), encoding="utf-8")

    by_proto_alive: Dict[str, int] = {}
    by_proto_dead: Dict[str, int] = {}
    for r in alive:
        by_proto_alive[r["proto"] or "?"] = by_proto_alive.get(r["proto"] or "?", 0) + 1
    for r in dead:
        by_proto_dead[r["proto"] or "?"] = by_proto_dead.get(r["proto"] or "?", 0) + 1

    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "input": input_file,
        "timeout": timeout,
        "workers": workers,
        "total": len(lines),
        "alive": len(alive),
        "dead": len(dead),
        "alive_rate": round(len(alive) / len(lines) * 100, 2) if lines else 0.0,
        "by_protocol_alive": dict(sorted(by_proto_alive.items())),
        "by_protocol_dead": dict(sorted(by_proto_dead.items())),
    }
    (out / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print(f"Checked {len(lines)} proxies: {len(alive)} alive, {len(dead)} dead "
          f"({summary['alive_rate']}% alive).")
    print(f"Output: {out}/alive.txt, {out}/dead.txt, {out}/summary.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
