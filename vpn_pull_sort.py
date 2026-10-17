#!/usr/bin/env python3
"""
vpn-pull-sort — fetch public VPN config subscription links, parse each proxy
line, and split into per-protocol / per-country files.

Usage:
    python3 vpn_pull_sort.py [links.txt] [--out out] [--workers 12]

Reads one URL per line (blank lines and # comments ignored). Non-URL lines
(russian annotations etc.) are skipped. Each fetched file is scanned line by
line; every proxy URI (vless://, vmess://, trojan://, ss://, ssr://,
hysteria2://, hy2://, tuic://, wireguard://) is classified by protocol and by
country (from the URI remark or embedded config), then written to:

    out/by_protocol/<PROTO>.txt
    out/by_country/<CC>.txt
    out/all_dedupe.txt
    out/summary.json

Supports raw.githubusercontent, github.com/blob, gh-proxy.org,
raw.githack.com, translate.yandex.ru, and workers.dev mirrors.
"""

from __future__ import annotations

import base64
import json
import os
import re
import sys
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
import urllib.request

# ---------------------------------------------------------------------------
# constants
# ---------------------------------------------------------------------------

DEFAULT_OUT = "vpn_sorted"
DEFAULT_LINKS = "links.txt"
PROTOCOLS = {"vless", "vmess", "trojan", "ss", "ssr", "hysteria2", "hy2", "tuic", "wireguard"}

# 2-letter country code candidates found inside a remark.
COUNTRY_CODE_RE = re.compile(r"\b([A-Z]{2})\b")
EMOJI_FLAG_RE = re.compile(r"([\U0001F1E6-\U0001F1FF]{2})")
# country name -> code (small, common set; extend as needed)
COUNTRY_NAMES: Dict[str, str] = {
    "iran": "IR", "iraq": "IQ", "turkey": "TR", "türkiye": "TR", "russia": "RU",
    "ukraine": "UA", "usa": "US", "united states": "US", "germany": "DE",
    "france": "FR", "netherlands": "NL", "canada": "CA", "uk": "GB",
    "united kingdom": "GB", "singapore": "SG", "japan": "JP", "korea": "KR",
    "south korea": "KR", "india": "IN", "brazil": "BR", "vietnam": "VN",
    "indonesia": "ID", "thailand": "TH", "malaysia": "MY", "philippines": "PH",
    "poland": "PL", "czech": "CZ", "romania": "RO", "bulgaria": "BG",
    "spain": "ES", "italy": "IT", "portugal": "PT", "switzerland": "CH",
    "austria": "AT", "sweden": "SE", "norway": "NO", "finland": "FI",
    "denmark": "DK", "ireland": "IE", "belgium": "BE", "luxembourg": "LU",
    "israel": "IL", "uae": "AE", "saudi arabia": "SA", "egypt": "EG",
    "morocco": "MA", "algeria": "DZ", "tunisia": "TN", "nigeria": "NG",
    "kenya": "KE", "south africa": "ZA", "australia": "AU", "new zealand": "NZ",
    "argentina": "AR", "chile": "CL", "mexico": "MX", "colombia": "CO",
    "peru": "PE", "venezuela": "VE", "china": "CN", "hong kong": "HK",
    "taiwan": "TW", "macau": "MO",
}

USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"


# ---------------------------------------------------------------------------
# url normalization
# ---------------------------------------------------------------------------

def normalize_url(url: str) -> str:
    url = url.strip()
    if not url:
        return url

    # translate.yandex.ru/translate?url=<inner>
    if "translate.yandex.ru/translate" in url:
        parsed = urllib.parse.urlparse(url)
        qs = urllib.parse.parse_qs(parsed.query)
        if "url" in qs:
            return qs["url"][0]

    # github.com/<user>/<repo>/blob/<ref>/<path>  -> raw
    m = re.match(
        r"https?://github\.com/([^/]+)/([^/]+)/blob/([^/]+)/(.+)$", url)
    if m:
        user, repo, ref, path = m.groups()
        return f"https://raw.githubusercontent.com/{user}/{repo}/{ref}/{path}"

    # raw.githack.com/<user>/<repo>/<ref>/<path> -> raw.githubusercontent
    m = re.match(
        r"https?://raw\.githack\.com/([^/]+)/([^/]+)/([^/]+)/(.+)$", url)
    if m:
        user, repo, ref, path = m.groups()
        return f"https://raw.githubusercontent.com/{user}/{repo}/{ref}/{path}"

    # gh-proxy.org/https://raw.githubusercontent.com/...  -> inner raw url
    if url.startswith("https://gh-proxy.org/"):
        inner = url[len("https://gh-proxy.org/"):]
        return inner

    return url


def is_url(line: str) -> bool:
    return line.startswith("http://") or line.startswith("https://")


# ---------------------------------------------------------------------------
# fetch
# ---------------------------------------------------------------------------

def fetch(url: str, timeout: int = 25) -> Tuple[str, Optional[str], Optional[str]]:
    """Fetch normalized url. Returns (original_url, text_or_None, error)."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = r.read()
        # try utf-8, fall back to latin-1 / ignore
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            text = data.decode("utf-8", errors="ignore")
        return url, text, None
    except Exception as exc:  # noqa: BLE001
        return url, None, str(exc)


def decode_subscription(text: str) -> List[str]:
    """If the whole file looks like a base64 subscription, decode it."""
    stripped = text.strip()
    # base64 subscription: long single base64 blob
    if re.fullmatch(r"[A-Za-z0-9+/=\s]{80,}", stripped) and "\n" not in stripped:
        try:
            dec = base64.b64decode(stripped, validate=False)
            return dec.decode("utf-8", errors="ignore").splitlines()
        except Exception:
            pass
    return text.splitlines()


# ---------------------------------------------------------------------------
# parsing
# ---------------------------------------------------------------------------

URI_RE = re.compile(r"^(vless|vmess|trojan|ss|ssr|hysteria2|hy2|tuic|wireguard)://\S+", re.I)


def set_remark(line: str, remark: str) -> str:
    """Replace the fragment (#remark) on a proxy URI with `remark`."""
    line = line.rstrip("\n")
    m = URI_RE.match(line)
    if m and m.group(1).lower() == "vmess":
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


def extract_country(text: str) -> str:
    """Guess a 2-letter country code from a line/remark."""
    low = text.lower()
    # explicit code like [IR], (US), -GB, #IR
    m = re.search(r"[\[\(\-#]\s*([A-Z]{2})\s*[\]\)]?\b", text)
    if m:
        return m.group(1).upper()
    # emoji flag -> map regional indicators to code (approx)
    mf = EMOJI_FLAG_RE.search(text)
    if mf:
        flag = mf.group(1)
        cp = [ord(c) - 0x1F1E6 + ord("A") for c in flag]
        code = "".join(chr(c) for c in cp)
        if len(code) == 2:
            return code.upper()
    # country name scan
    for name, code in COUNTRY_NAMES.items():
        if re.search(r"\b" + re.escape(name) + r"\b", low):
            return code
    m = COUNTRY_CODE_RE.search(text)
    if m:
        code = m.group(1).upper()
        if code in set(COUNTRY_NAMES.values()):
            return code
    return "XX"


def classify_line(line: str) -> Tuple[Optional[str], str, str]:
    """
    Returns (protocol, country, line). protocol None if not a proxy URI.
    Country extracted from remark / embedded config.
    """
    line = line.strip()
    if not line or line.startswith("#"):
        return None, "XX", line

    m = URI_RE.match(line)
    if not m:
        # could be a base64 vmess line inside a json config; skip non-uri
        return None, "XX", line

    proto = m.group(1).lower()
    remark = ""
    hash_i = line.find("#")
    if hash_i != -1:
        remark = line[hash_i + 1:]

    # vmess payload is base64 json after '://'
    if proto == "vmess":
        payload = line[len("vmess://"):]
        try:
            pad = "=" * (-len(payload) % 4)
            dec = base64.b64decode(payload + pad, validate=False).decode("utf-8", errors="ignore")
            cfg = json.loads(dec)
            ps = str(cfg.get("ps", ""))
            remark = ps or remark
        except Exception:
            pass

    country = extract_country(remark or line)
    return proto, country.upper(), line


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def read_links(source: str) -> List[str]:
    links: List[str] = []
    p = Path(source)
    if not p.exists():
        # treat whole source as a single url
        return [source] if is_url(source) else []
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        links.append(line)
    seen: Set[str] = set()
    uniq: List[str] = []
    for l in links:
        if l not in seen:
            seen.add(l)
            uniq.append(l)
    return uniq


def main(argv: Optional[List[str]] = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    links_file = args[0] if args and not args[0].startswith("--") else DEFAULT_LINKS
    out = Path(DEFAULT_OUT)
    workers = 12
    remark = None
    i = 1
    while i < len(args):
        if args[i] == "--out" and i + 1 < len(args):
            out = Path(args[i + 1]); i += 2
        elif args[i] == "--workers" and i + 1 < len(args):
            workers = int(args[i + 1]); i += 2
        elif args[i] == "--remark" and i + 1 < len(args):
            remark = args[i + 1]; i += 2
        else:
            i += 1

    raw_links = read_links(links_file)
    if not raw_links:
        print("No links found.", file=sys.stderr)
        return 1

    # split: http(s) subscription URLs to fetch, vs direct proxy-URI lines to parse
    http_urls = [u for u in raw_links if u.startswith("http")]
    direct_proxy_lines = [u for u in raw_links if not u.startswith("http")]

    # fetch concurrently
    fetched: List[Tuple[str, Optional[str], Optional[str]]] = []
    with ThreadPoolExecutor(max_workers=workers) as ex:
        fut_map = {ex.submit(fetch, normalize_url(u)): u for u in http_urls}
        for fut in as_completed(fut_map):
            fetched.append(fut.result())

    # collect proxy lines from fetched subscriptions
    by_proto: Dict[str, List[str]] = {p: [] for p in PROTOCOLS}
    by_country: Dict[str, List[str]] = {}
    all_lines: List[str] = []
    seen_lines: Set[str] = set()
    stats: Dict[str, int] = {"fetched": 0, "failed": 0, "lines": 0, "proxies": 0}

    def consume(text: str) -> None:
        nonlocal stats
        for line in decode_subscription(text):
            stats["lines"] += 1
            proto, country, clean = classify_line(line)
            if proto is None:
                continue
            if clean in seen_lines:
                continue
            seen_lines.add(clean)
            stats["proxies"] += 1
            out_line = set_remark(clean, remark) if remark else clean
            all_lines.append(out_line)
            by_proto.setdefault(proto, []).append(out_line)
            by_country.setdefault(country, []).append(out_line)

    for orig_url, text, err in fetched:
        if err or text is None:
            stats["failed"] += 1
            print(f"FAIL {orig_url}: {err}", file=sys.stderr)
            continue
        stats["fetched"] += 1
        consume(text)

    # parse any direct proxy-URI lines supplied in the input file
    if direct_proxy_lines:
        stats["fetched"] += 1  # treat the local file as one fetched source
        consume("\n".join(direct_proxy_lines))

    # write outputs
    out.mkdir(parents=True, exist_ok=True)
    proto_dir = out / "by_protocol"
    country_dir = out / "by_country"
    proto_dir.mkdir(exist_ok=True)
    country_dir.mkdir(exist_ok=True)

    for proto, lines in sorted(by_proto.items()):
        if not lines:
            continue
        (proto_dir / f"{proto}.txt").write_text(
            "\n".join(sorted(set(lines))) + "\n", encoding="utf-8")

    for cc, lines in sorted(by_country.items()):
        if not lines:
            continue
        (country_dir / f"{cc}.txt").write_text(
            "\n".join(sorted(set(lines))) + "\n", encoding="utf-8")

    (out / "all_dedupe.txt").write_text(
        "\n".join(sorted(set(all_lines))) + "\n", encoding="utf-8")

    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "links_given": len(raw_links),
        "fetched_ok": stats["fetched"],
        "fetched_failed": stats["failed"],
        "total_lines_scanned": stats["lines"],
        "total_proxy_lines": stats["proxies"],
        "unique_proxy_lines": len(seen_lines),
        "by_protocol": {p: len(v) for p, v in sorted(by_proto.items()) if v},
        "by_country": {c: len(v) for c, v in sorted(by_country.items()) if v},
    }
    (out / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print(f"Fetched {stats['fetched']}/{len(raw_links)} links ({stats['failed']} failed).")
    print(f"Scanned {stats['lines']} lines, found {stats['proxies']} proxy URIs "
          f"({len(seen_lines)} unique).")
    print(f"Output: {out}/by_protocol, {out}/by_country, {out}/all_dedupe.txt, {out}/summary.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
