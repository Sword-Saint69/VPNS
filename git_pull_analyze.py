#!/usr/bin/env python3
"""
git-pull-analyze — clone several git raw links and analyse each repository.

Usage:
    python3 git_pull_analyze.py links.txt [--out report] [--full] [--force]
    python3 git_pull_analyze.py https://... https://... --out report
    cat links.txt | python3 git_pull_analyze.py -

Reads one git URL per line (blank lines and # comments ignored), clones each
repo into <out>/repos/<name>/, then writes <out>/summary.json and
<out>/summary.md with per-repo and aggregate statistics.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# configuration
# ---------------------------------------------------------------------------

DEFAULT_OUT = "report"
DEFAULT_LINKS_FILE = "links.txt"
CLONE_DIR_NAME = "repos"
REPORT_JSON = "summary.json"
REPORT_MD = "summary.md"

# shallow clone by default; full history only with --full
SHALLOW_FLAGS = ["--depth", "1", "--single-branch"]

SECRET_PATTERNS: List[Tuple[str, re.Pattern[str]]] = [
    ("aws_access_key", re.compile(r"AKIA[0-9A-Z]{16}")),
    ("aws_secret_key", re.compile(r"[0-9a-zA-Z/+]{40}")),
    ("github_token", re.compile(r"ghp_[0-9a-zA-Z]{36,}|github_pat_[0-9a-zA-Z_]{20,}")),
    ("slack_token", re.compile(r"xox[baprs]-([0-9a-zA-Z]{10,48})")),
    ("private_key", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("pem_certificate", re.compile(r"-----BEGIN CERTIFICATE-----")),
    ("generic_password", re.compile(r"(?i)(passwd|password|pwd|secret|api[_-]?key|token)\s*[:=]\s*['\"]?[^\s'\"]{6,}")),
    ("connection_string", re.compile(r"(?i)(mongodb|postgres|mysql|redis)://[^\s'\"<>]+")),
    ("jwt", re.compile(r"eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+")),
    ("ssh_private_key", re.compile(r"-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----")),
]

TODO_PATTERNS: List[Tuple[str, re.Pattern[str]]] = [
    ("TODO", re.compile(r"(?i)\bTODO\b")),
    ("FIXME", re.compile(r"(?i)\bFIXME\b")),
    ("HACK", re.compile(r"(?i)\bHACK\b")),
    ("XXX", re.compile(r"\bXXX\b")),
    ("BUG", re.compile(r"(?i)\bBUG\b")),
]

EXTENSION_LANGUAGE: Dict[str, str] = {
    ".py": "Python",
    ".js": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".jsx": "JavaScript",
    ".java": "Java",
    ".kt": "Kotlin",
    ".go": "Go",
    ".rs": "Rust",
    ".c": "C",
    ".h": "C/C++",
    ".cpp": "C++",
    ".cc": "C++",
    ".cxx": "C++",
    ".hpp": "C++",
    ".cs": "C#",
    ".rb": "Ruby",
    ".php": "PHP",
    ".swift": "Swift",
    ".m": "Objective-C",
    ".mm": "Objective-C++",
    ".scala": "Scala",
    ".clj": "Clojure",
    ".hs": "Haskell",
    ".ml": "OCaml",
    ".fs": "F#",
    ".lua": "Lua",
    ".r": "R",
    ".pl": "Perl",
    ".sh": "Shell",
    ".bash": "Shell",
    ".zsh": "Shell",
    ".ps1": "PowerShell",
    ".sql": "SQL",
    ".html": "HTML",
    ".htm": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".sass": "Sass",
    ".less": "Less",
    ".xml": "XML",
    ".json": "JSON",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".toml": "TOML",
    ".ini": "INI",
    ".cfg": "INI",
    ".conf": "Conf",
    ".md": "Markdown",
    ".rst": "reStructuredText",
    ".tex": "LaTeX",
    ".dockerfile": "Dockerfile",
    ".tf": "Terraform",
    ".lock": "Lockfile",
}

SKIP_DIRS = {".git", ".svn", ".hg", "node_modules", "__pycache__", ".venv", "venv", ".env", "dist", "build", ".next", ".cache"}
SKIP_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".svg", ".woff", ".woff2", ".ttf", ".eot", ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar", ".pdf", ".bin", ".exe", ".dll", ".so", ".dylib", ".pyc", ".class", ".o", ".a", ".lib"}

MAX_FILE_BYTES = 2_000_000  # skip files larger than 2MB for text scanning


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
def run(cmd: List[str], cwd: Optional[Path] = None, capture: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=str(cwd) if cwd else None,
                          capture_output=capture, text=True)


def sanitize_repo_name(url: str) -> str:
    """Derive a directory name from a git URL."""
    url = url.strip().rstrip("/")
    if url.endswith(".git"):
        url = url[:-4]
    name = url.rsplit("/", 1)[-1]
    if not name:
        name = hashlib.sha1(url.encode()).hexdigest()[:12]
    return name


def read_links(source: str) -> List[str]:
    """Read git URLs from a file, positional args list, or stdin ('-')."""
    links: List[str] = []
    if source == "-":
        data = sys.stdin.read()
    else:
        p = Path(source)
        if not p.exists():
            # treat source as a single URL
            return [source]
        data = p.read_text(encoding="utf-8")
    for line in data.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        links.append(line)
    # de-duplicate preserving order
    seen = set()
    uniq: List[str] = []
    for l in links:
        if l not in seen:
            seen.add(l)
            uniq.append(l)
    return uniq


# ---------------------------------------------------------------------------
# clone
# ---------------------------------------------------------------------------

def clone_repo(url: str, dest: Path, shallow: bool, force: bool) -> Dict:
    """Clone a single repo. Returns a result dict."""
    result: Dict = {
        "url": url,
        "name": sanitize_repo_name(url),
        "dest": str(dest),
        "cloned": False,
        "error": None,
    }
    if dest.exists():
        if force:
            shutil.rmtree(dest)
        else:
            result["cloned"] = True
            result["skipped"] = True
            return result
    dest.parent.mkdir(parents=True, exist_ok=True)
    cmd = ["git", "clone"]
    if shallow:
        cmd += SHALLOW_FLAGS
    cmd += [url, str(dest)]
    proc = run(cmd)
    if proc.returncode != 0:
        result["error"] = (proc.stderr or proc.stdout or "clone failed").strip()
        return result
    result["cloned"] = True
    return result


# ---------------------------------------------------------------------------
# analysis
# ---------------------------------------------------------------------------

def git_log(dest: Path) -> Dict:
    """Gather lightweight git history metadata."""
    info: Dict = {"commit_count": 0, "last_commit": None, "authors": [], "branches": []}
    proc = run(["git", "-C", str(dest), "rev-list", "--count", "HEAD"])
    if proc.returncode == 0 and proc.stdout.strip():
        try:
            info["commit_count"] = int(proc.stdout.strip())
        except ValueError:
            pass
    proc = run(["git", "-C", str(dest), "log", "-1",
                "--format=%H|%an|%ae|%ad|%s", "--date=iso8601"])
    if proc.returncode == 0 and proc.stdout.strip():
        parts = proc.stdout.strip().split("|", 4)
        if len(parts) == 5:
            info["last_commit"] = {
                "hash": parts[0],
                "author": parts[1],
                "email": parts[2],
                "date": parts[3],
                "message": parts[4],
            }
    proc = run(["git", "-C", str(dest), "branch", "-a"])
    if proc.returncode == 0:
        info["branches"] = [b.strip().lstrip("* ").strip() for b in proc.stdout.splitlines() if b.strip()]
    return info


def analyse_repo(dest: Path, shallow: bool) -> Dict:
    """Analyse a cloned repository on disk."""
    name = dest.name
    files: List[Dict] = []
    lang_bytes: Dict[str, int] = {}
    lang_files: Dict[str, int] = {}
    total_bytes = 0
    total_files = 0
    secrets: List[Dict] = []
    markers: List[Dict] = []
    largest: List[Dict] = []

    for root, dirs, filenames in os.walk(dest):
        # prune skip dirs in-place
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fname in filenames:
            fpath = Path(root) / fname
            try:
                stat = fpath.stat()
            except OSError:
                continue
            size = stat.st_size
            rel = fpath.relative_to(dest).as_posix()
            total_files += 1
            total_bytes += size
            largest.append({"path": rel, "size": size, "bytes": size})

            ext = fpath.suffix.lower()
            lang = EXTENSION_LANGUAGE.get(ext, "Other")
            if fname.lower() == "dockerfile":
                lang = "Dockerfile"
            lang_bytes[lang] = lang_bytes.get(lang, 0) + size
            lang_files[lang] = lang_files.get(lang, 0) + 1

            if size > MAX_FILE_BYTES or ext in SKIP_EXTENSIONS:
                continue
            try:
                text = fpath.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            if not text:
                continue
            lines = text.splitlines()
            # secrets
            for label, pat in SECRET_PATTERNS:
                for m in pat.finditer(text):
                    secrets.append({
                        "file": rel,
                        "type": label,
                        "match": m.group(0)[:120],
                    })
            # TODO/FIXME markers
            for i, line in enumerate(lines, start=1):
                for label, pat in TODO_PATTERNS:
                    if pat.search(line):
                        markers.append({
                            "file": rel,
                            "line": i,
                            "type": label,
                            "text": line.strip()[:200],
                        })
                        break

    largest.sort(key=lambda x: x["size"], reverse=True)
    largest = largest[:10]

    return {
        "name": name,
        "path": str(dest),
        "total_files": total_files,
        "total_bytes": total_bytes,
        "languages": {
            lang: {"files": lang_files.get(lang, 0), "bytes": lang_bytes.get(lang, 0)}
            for lang in sorted(lang_bytes, key=lambda l: lang_bytes[l], reverse=True)
        },
        "secrets": secrets,
        "secret_count": len(secrets),
        "markers": markers,
        "marker_count": len(markers),
        "largest_files": largest,
        "git": git_log(dest) if not shallow else {},
    }


# ---------------------------------------------------------------------------
# report
# ---------------------------------------------------------------------------

def build_report(results: List[Dict], out: Path, shallow: bool) -> Dict:
    out.mkdir(parents=True, exist_ok=True)
    repos_dir = out / CLONE_DIR_NAME

    clone_results: List[Dict] = []
    analyses: List[Dict] = []

    # clone phase
    with ThreadPoolExecutor(max_workers=min(8, max(1, len(results)))) as ex:
        fut_map = {}
        for entry in results:
            url = entry if isinstance(entry, str) else entry["url"]
            dest = repos_dir / sanitize_repo_name(url)
            fut = ex.submit(clone_repo, url, dest, shallow, entry.get("force", False) if isinstance(entry, dict) else False)
            fut_map[fut] = (url, dest)
        for fut in as_completed(fut_map):
            url, dest = fut_map[fut]
            clone_results.append(fut.result())

    # analyse phase
    for cr in clone_results:
        dest = Path(cr["dest"])
        if cr.get("skipped") and dest.exists():
            pass
        if not dest.exists():
            analyses.append({**cr, "analysis": None, "analysed": False})
            continue
        analysis = analyse_repo(dest, shallow)
        analyses.append({**cr, "analysis": analysis, "analysed": True})

    # aggregate
    agg = {
        "total_repos": len(analyses),
        "cloned": sum(1 for a in analyses if a.get("cloned")),
        "failed": sum(1 for a in analyses if a.get("error")),
        "total_files": 0,
        "total_bytes": 0,
        "languages": {},
        "total_secrets": 0,
        "total_markers": 0,
    }
    for a in analyses:
        ana = a.get("analysis")
        if not ana:
            continue
        agg["total_files"] += ana["total_files"]
        agg["total_bytes"] += ana["total_bytes"]
        agg["total_secrets"] += ana["secret_count"]
        agg["total_markers"] += ana["marker_count"]
        for lang, info in ana["languages"].items():
            e = agg["languages"].setdefault(lang, {"files": 0, "bytes": 0})
            e["files"] += info["files"]
            e["bytes"] += info["bytes"]

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "shallow": shallow,
        "aggregate": agg,
        "repos": analyses,
    }

    (out / REPORT_JSON).write_text(json.dumps(report, indent=2), encoding="utf-8")
    write_markdown(report, out / REPORT_MD)
    return report


def write_markdown(report: Dict, path: Path) -> None:
    agg = report["aggregate"]
    lines: List[str] = []
    lines.append("# Git Pull & Analyse Report")
    lines.append("")
    lines.append(f"- Generated: {report['generated_at']}")
    lines.append(f"- Shallow clones: {report['shallow']}")
    lines.append(f"- Repositories: {agg['total_repos']} (cloned {agg['cloned']}, failed {agg['failed']})")
    lines.append(f"- Total files: {agg['total_files']}")
    lines.append(f"- Total size: {agg['total_bytes']:,} bytes")
    lines.append(f"- Potential secrets found: {agg['total_secrets']}")
    lines.append(f"- TODO/FIXME markers: {agg['total_markers']}")
    lines.append("")
    lines.append("## Aggregate languages (by bytes)")
    lines.append("")
    lines.append("| language | files | bytes |")
    lines.append("|----------|-------|-------|")
    for lang, info in sorted(agg["languages"].items(), key=lambda kv: kv[1]["bytes"], reverse=True):
        lines.append(f"| {lang} | {info['files']} | {info['bytes']:,} |")
    lines.append("")
    lines.append("## Per-repository results")
    lines.append("")
    for a in report["repos"]:
        name = a.get("name") or sanitize_repo_name(a["url"])
        lines.append(f"### {name}")
        lines.append(f"- URL: {a['url']}")
        lines.append(f"- Cloned: {a.get('cloned', False)}")
        if a.get("error"):
            lines.append(f"- Error: {a['error']}")
            lines.append("")
            continue
        ana = a.get("analysis")
        if not ana:
            lines.append("- Not analysed (directory missing).")
            lines.append("")
            continue
        lines.append(f"- Files: {ana['total_files']}")
        lines.append(f"- Size: {ana['total_bytes']:,} bytes")
        lines.append(f"- Secrets: {ana['secret_count']}")
        lines.append(f"- Markers: {ana['marker_count']}")
        if ana.get("git"):
            g = ana["git"]
            lines.append(f"- Commits: {g.get('commit_count', 0)}")
            if g.get("last_commit"):
                lc = g["last_commit"]
                lines.append(f"- Last commit: {lc['date']} — {lc['author']} — {lc['message'][:80]}")
        if ana["languages"]:
            lines.append("")
            lines.append("Languages:")
            for lang, info in sorted(ana["languages"].items(), key=lambda kv: kv[1]["bytes"], reverse=True):
                lines.append(f"  - {lang}: {info['files']} files, {info['bytes']:,} bytes")
        if ana["secrets"]:
            lines.append("")
            lines.append("Potential secrets:")
            for s in ana["secrets"][:20]:
                lines.append(f"  - {s['file']} — {s['type']}: {s['match']}")
        if ana["markers"]:
            lines.append("")
            lines.append("Markers (TODO/FIXME/etc):")
            for m in ana["markers"][:20]:
                lines.append(f"  - {m['file']}:{m['line']} [{m['type']}] {m['text']}")
        if ana["largest_files"]:
            lines.append("")
            lines.append("Largest files:")
            for lf in ana["largest_files"][:5]:
                lines.append(f"  - {lf['path']} — {lf['size']:,} bytes")
        lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


# ---------------------------------------------------------------------------
# cli
# ---------------------------------------------------------------------------

def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Clone several git raw links and analyse them.")
    p.add_argument("sources", nargs="*", help="Git URL(s) or a links file (one URL per line). Use '-' for stdin.")
    p.add_argument("--out", default=DEFAULT_OUT, help=f"Output directory (default: {DEFAULT_OUT})")
    p.add_argument("--full", action="store_true", help="Full history clone (default is shallow depth-1)")
    p.add_argument("--force", action="store_true", help="Re-clone even if directory exists")
    p.add_argument("--input", help="Links file (overrides positional source if given)")
    return p.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    sources = [args.input] if args.input else args.sources
    if not sources:
        sources = [DEFAULT_LINKS_FILE]

    all_links: List[str] = []
    for src in sources:
        all_links.extend(read_links(src))

    if not all_links:
        print("No git links found.", file=sys.stderr)
        return 1

    entries = [{"url": u, "force": args.force} for u in all_links]
    report = build_report(entries, Path(args.out), shallow=not args.full)

    agg = report["aggregate"]
    print(f"Analysed {agg['total_repos']} repos: {agg['cloned']} cloned, {agg['failed']} failed.")
    print(f"Files: {agg['total_files']}, size: {agg['total_bytes']:,} bytes.")
    print(f"Secrets: {agg['total_secrets']}, markers: {agg['total_markers']}.")
    print(f"Report: {args.out}/{REPORT_JSON} and {args.out}/{REPORT_MD}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
