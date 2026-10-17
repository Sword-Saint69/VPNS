#!/usr/bin/env python3
"""
vpn_revive — diagnose failed subscription links and attempt to revive them.

Reads links.txt, re-fetches every URL, records failures, then for each failed
link tries revival strategies:

  * github.com/<user>/<repo>/tree/ ref /<dir>  -> GitHub REST API to list the
    directory and emit raw.githubusercontent.com URLs for every file inside.
  * 404 on raw.githubusercontent                 -> retry via raw.githack,
    jsdelivr, and gitcdn mirrors.
  * gh-proxy.org failure                       -> retry direct raw URL.
  * translate.yandex.ru failure                -> retry extracted inner URL.

Writes:
    out/failed.json     — every failed link with reason and revival attempts
    out/revived.txt     — successfully revived raw URLs (appended to links)
    out/revived_links.txt — full links file with revivals merged in
    out/revived_sorted/  — pull+sort output from revived links only

Usage:
    python3 vpn_revive.py [links.txt] [--out revived] [--workers 12]
"""

from __future__ import annotations

import base64
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
import urllib.request as _req

DEFAULT_LINKS = "links.txt"
DEFAULT_OUT = "revived"
USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"


def normalize_url(url: str) -> str:
    url = url.strip()
    if not url:
        return url
    if "translate.yandex.ru/translate" in url:
        parsed = urllib.parse.urlparse(url)
        qs = urllib.parse.parse_qs(parsed.query)
        if "url" in qs:
            return qs["url"][0]
    m = re.match(r"https?://github\.com/([^/]+)/([^/]+)/blob/([^/]+)/(.+)$", url)
    if m:
        user, repo, ref, path = m.groups()
        return f"https://raw.githubusercontent.com/{user}/{repo}/{ref}/{path}"
    m = re.match(r"https?://raw\.githack\.com/([^/]+)/([^/]+)/([^/]+)/(.+)$", url)
    if m:
        user, repo, ref, path = m.groups()
        return f"https://raw.githubusercontent.com/{user}/{repo}/{ref}/{path}"
    if url.startswith("https://gh-proxy.org/"):
        return url[len("https://gh-proxy.org/"):]
    return url


def is_url(line: str) -> bool:
    return line.startswith("http://") or line.startswith("https://")


def read_links(source: str) -> List[str]:
    links: List[str] = []
    p = Path(source)
    if not p.exists():
        return [source] if is_url(source) else []
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if is_url(line):
            links.append(line)
    seen: Set[str] = set()
    uniq: List[str] = []
    for l in links:
        if l not in seen:
            seen.add(l)
            uniq.append(l)
    return uniq


def fetch(url: str, timeout: int = 20) -> Tuple[Optional[str], Optional[str], int]:
    """Return (text_or_None, error_or_None, http_status_or_0)."""
    try:
        req = _req.Request(url, headers={"User-Agent": USER_AGENT})
        with _req.urlopen(req, timeout=timeout) as r:
            data = r.read()
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            text = data.decode("utf-8", errors="ignore")
        return text, None, getattr(r, "status", 200)
    except _req.HTTPError as e:
        try:
            body = e.read().decode("utf-8", errors="ignore")[:200]
        except Exception:
            body = ""
        return None, f"HTTP {e.code}: {body.strip()}", e.code
    except _req.URLError as e:
        return None, f"URL error: {e}", 0
    except Exception as e:  # noqa: BLE001
        return None, f"error: {e}", 0


def is_github_tree(url: str) -> bool:
    return bool(re.match(r"https?://github\.com/([^/]+)/([^/]+)/tree/([^/]+)/(.+)$", url))


def parse_github_tree(url: str) -> Optional[Tuple[str, str, str, str]]:
    m = re.match(r"https?://github\.com/([^/]+)/([^/]+)/tree/([^/]+)/(.+)$", url)
    if not m:
        return None
    return m.group(1), m.group(2), m.group(3), m.group(4)  # user, repo, ref, dirpath


def api_list_dir(user: str, repo: str, ref: str, dirpath: str) -> List[Dict]:
    """Use GitHub REST API to list a directory; return raw file URLs."""
    api = f"https://api.github.com/repos/{user}/{repo}/contents/{dirpath}?ref={ref}"
    text, err, status = fetch(api)
    if err or text is None:
        return []
    try:
        items = json.loads(text)
    except json.JSONDecodeError:
        return []
    if not isinstance(items, list):
        return []
    raw_urls: List[Dict] = []
    for it in items:
        if not isinstance(it, dict):
            continue
        if it.get("type") == "file":
            download = it.get("download_url")
            path = it.get("path", "")
            if download:
                raw_urls.append({"url": download, "path": path})
        elif it.get("type") == "dir":
            # recurse one level
            sub = api_list_dir(user, repo, ref, it.get("path", ""))
            raw_urls.extend(sub)
    return raw_urls


def mirror_candidates(raw_url: str) -> List[str]:
    """Alternative hosts for a raw.githubusercontent URL."""
    m = re.match(r"https?://raw\.githubusercontent\.com/([^/]+)/([^/]+)/([^/]+)/(.+)$", raw_url)
    if not m:
        return []
    user, repo, ref, path = m.groups()
    return [
        f"https://raw.githack.com/{user}/{repo}/{ref}/{path}",
        f"https://cdn.jsdelivr.net/gh/{user}/{repo}@{ref}/{path}",
        f"https://gitcdn.link/repo/{user}/{repo}/{ref}/{path}",
    ]


def revive_one(original: str, norm: str) -> Dict:
    """Try to revive a single failed link. Returns a result dict."""
    result: Dict = {
        "original": original,
        "normalized": norm,
        "status": "failed",
        "reason": None,
        "revived_urls": [],
    }

    text, err, status = fetch(norm)
    if text is not None:
        result["status"] = "ok"
        result["reason"] = None
        result["revived_urls"] = [norm]
        return result

    result["reason"] = err or "unknown"
    result["http_status"] = status

    # Strategy 1: github.com/tree -> GitHub API directory listing
    if is_github_tree(original):
        parsed = parse_github_tree(original)
        if parsed:
            user, repo, ref, dirpath = parsed
            files = api_list_dir(user, repo, ref, dirpath)
            for f in files:
                result["revived_urls"].append(f["url"])
            if files:
                result["status"] = "revived"
                result["reason"] = f"tree -> {len(files)} raw files via GitHub API"
            return result

    # Strategy 2: 404 on raw -> alternative mirrors
    if status == 404:
        for cand in mirror_candidates(norm):
            ct, ce, cs = fetch(cand)
            if ct is not None:
                result["status"] = "revived"
                result["reason"] = f"404 -> {cand}"
                result["revived_urls"] = [cand]
                return result
        result["reason"] = f"404 (all mirrors failed): {err}"
        return result

    # Strategy 3: gh-proxy -> direct raw
    if "gh-proxy.org" in original:
        inner = original[len("https://gh-proxy.org/"):]
        ct, ce, cs = fetch(inner)
        if ct is not None:
            result["status"] = "revived"
            result["reason"] = "gh-proxy -> direct raw"
            result["revived_urls"] = [inner]
            return result
        # inner may itself be blob -> normalize
        inner_norm = normalize_url(inner)
        if inner_norm != inner:
            ct2, ce2, cs2 = fetch(inner_norm)
            if ct2 is not None:
                result["status"] = "revived"
                result["reason"] = "gh-proxy -> normalized raw"
                result["revived_urls"] = [inner_norm]
                return result

    # Strategy 4: translate.yandex -> inner url already normalized; retry inner directly
    if "translate.yandex.ru" in original:
        parsed = urllib.parse.urlparse(original)
        qs = urllib.parse.parse_qs(parsed.query)
        if "url" in qs:
            ct, ce, cs = fetch(qs["url"][0])
            if ct is not None:
                result["status"] = "revived"
                result["reason"] = "yandex -> inner raw"
                result["revived_urls"] = [qs["url"][0]]
                return result

    return result


def main(argv: Optional[List[str]] = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    links_file = args[0] if args and not args[0].startswith("--") else DEFAULT_LINKS
    out = Path(DEFAULT_OUT)
    workers = 12
    quiet = False
    i = 1
    while i < len(args):
        if args[i] == "--out" and i + 1 < len(args):
            out = Path(args[i + 1]); i += 2
        elif args[i] == "--workers" and i + 1 < len(args):
            workers = int(args[i + 1]); i += 2
        elif args[i] in ("--quiet", "-q"):
            quiet = True; i += 1
        else:
            i += 1

    raw_links = read_links(links_file)
    if not raw_links:
        print("No links found.", file=sys.stderr)
        return 1

    if not quiet:
        print(f"Re-checking {len(raw_links)} links ...")
    results: List[Dict] = []
    with ThreadPoolExecutor(max_workers=workers) as ex:
        fut_map = {ex.submit(revive_one, u, normalize_url(u)): u for u in raw_links}
        for fut in as_completed(fut_map):
            results.append(fut.result())

    ok = [r for r in results if r["status"] == "ok"]
    revived = [r for r in results if r["status"] == "revived"]
    still_failed = [r for r in results if r["status"] == "failed"]

    if not quiet:
        print(f"OK: {len(ok)}  Revived: {len(revived)}  Still failed: {len(still_failed)}")

    out.mkdir(parents=True, exist_ok=True)

    # failed.json — full detail
    failed_detail = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total": len(results),
        "ok": len(ok),
        "revived": len(revived),
        "still_failed": len(still_failed),
        "revived_links": [r["revived_urls"][0] for r in revived if r["revived_urls"]],
        "still_failed_detail": [
            {"original": r["original"], "normalized": r["normalized"],
             "reason": r["reason"], "http_status": r.get("http_status")}
            for r in still_failed
        ],
    }
    (out / "failed.json").write_text(json.dumps(failed_detail, indent=2), encoding="utf-8")

    # revived.txt — just the revived raw URLs
    revived_urls: List[str] = []
    for r in revived:
        revived_urls.extend(r["revived_urls"])
    (out / "revived.txt").write_text("\n".join(revived_urls) + ("\n" if revived_urls else ""), encoding="utf-8")

    # revived_links.txt — original links + revived URLs merged
    all_links = list(raw_links)
    for u in revived_urls:
        if u not in all_links:
            all_links.append(u)
    (out / "revived_links.txt").write_text("\n".join(all_links) + "\n", encoding="utf-8")

    if not quiet:
        if still_failed:
            print("\nStill failed (could not revive):")
            for r in still_failed:
                print(f"  {r['original']}")
                print(f"    -> {r['normalized']}  ({r['reason']})")

        if revived:
            print("\nRevived links:")
            for r in revived:
                for u in r["revived_urls"]:
                    print(f"  {r['original']}  =>  {u}")

    return 0 if not still_failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
