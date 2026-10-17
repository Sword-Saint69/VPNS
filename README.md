# VPN Auto Check — sword-saint69

Pulls public VPN config subscription links, sorts them by protocol/country,
then liveness-checks every proxy URI. Results are committed back to this repo
and displayed on GitHub Pages.

## Files
- `links.txt` — source subscription URLs (one per line)
- `vpn_pull_sort.py` — fetch + sort into `vpn_sorted/by_protocol`, `by_country`
- `vpn_check.py` — TCP liveness check → `vpn_checked/alive.txt | dead.txt | summary.json`
- `tagged/` — copies of results with `sword-saint69` in the filename
- `.github/workflows/vpn-check.yml` — runs every 6 hours + on push/dispatch
- `index.html` — dashboard (GitHub Pages)

## Output naming
All result files carry the username: `summary_sword-saint69.json`,
`alive_sword-saint69.txt`, `dead_sword-saint69.txt`,
`pull_summary_sword-saint69.json`.

## Enable GitHub Pages
1. Go to repository **Settings → Pages**.
2. Build and deployment source: **Deploy from a branch**.
3. Branch: `main`, folder: `/ (root)`.
4. Save. The site will be at `https://sword-saint69.github.io/<repo-name>/`.

## Run locally
```bash
python3 vpn_pull_sort.py links.txt --out vpn_sorted --workers 12
python3 vpn_check.py vpn_sorted/all_dedupe.txt --out vpn_checked --timeout 3 --workers 200
```
Add `--quiet` to disable the live terminal counter (useful in CI).

## Rename proxies to Sword-saint69
Pass `--remark Sword-saint69` to either script so every proxy URI's `#remark` becomes `Sword-saint69` (vmess `ps` field included):

```bash
python3 vpn_pull_sort.py links.txt --out vpn_sorted --remark Sword-saint69
python3 vpn_check.py vpn_sorted/all_dedupe.txt --out vpn_checked --remark Sword-saint69 --quiet
```

You can also feed a local file of proxy URIs directly to `vpn_pull_sort.py` (no fetch needed) and have them sorted + renamed.
