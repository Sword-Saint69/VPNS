# PulseGate — sword-saint69

Live proxy pool dashboard. Pulls public VPN config subscription links, sorts
them by protocol/country, then liveness-checks every proxy URI over TCP.
Results are regenerated **every hour** by GitHub Actions, committed back to
this repo, and rendered on GitHub Pages.

**Live:** https://sword-saint69.github.io/VPNS/

## Dashboard
React + Vite + Tailwind + Framer Motion, white theme:

- Alive-rate ring and animated counters (hero + bento metrics)
- Alive trend sparkline across the last 168 hourly checks
  (`tagged/history_sword-saint69.json`)
- Protocol split bars (alive vs dead, volume-scaled)
- Searchable / filterable alive list with per-row copy buttons
- Freshness pill in the navbar (amber when data is > 2.5h old)

The build stages `tagged/` into `dist/` (vite plugin) because GitHub Pages
only ships `dist/`.

## Files
- `links.txt` — source subscription URLs (one per line)
- `vpn_revive.py` — revives dead source links (mirror fallbacks + GitHub API for tree dirs)
- `vpn_pull_sort.py` — fetch + sort into `vpn_sorted/by_protocol`, `by_country`
- `vpn_check.py` — TCP liveness check → `vpn_checked/alive.txt | dead.txt | summary.json`
- `tagged/` — copies of results with `sword-saint69` in the filename
- `.github/workflows/vpn-check.yml` — hourly (`:17`) + on push/dispatch
- `src/` + `index.html` — PulseGate dashboard (GitHub Pages)

## Output naming
All result files carry the username: `summary_sword-saint69.json`,
`alive_sword-saint69.txt`, `dead_sword-saint69.txt`,
`pull_summary_sword-saint69.json`, `history_sword-saint69.json`.

## GitHub Pages
Deployment is **GitHub Actions** based (Settings → Pages → Source:
GitHub Actions). The workflow builds the dashboard, uploads `dist/` and
deploys it through `actions/deploy-pages`.

## Run locally
```bash
npm install
npm run dev     # dashboard at http://localhost:5173/VPNS/

python3 vpn_pull_sort.py links.txt --out vpn_sorted --workers 12
python3 vpn_check.py vpn_sorted/all_dedupe.txt --out vpn_checked --timeout 3 --workers 200
```
Add `--quiet` to disable the live terminal counter (useful in CI).

## Rename proxies to Sword-saint69
Pass `--remark Sword-saint69` to either script so every proxy URI's `#remark`
becomes `Sword-saint69` (vmess `ps` field included):

```bash
python3 vpn_pull_sort.py links.txt --out vpn_sorted --remark Sword-saint69
python3 vpn_check.py vpn_sorted/all_dedupe.txt --out vpn_checked --remark Sword-saint69 --quiet
```

You can also feed a local file of proxy URIs directly to `vpn_pull_sort.py`
(no fetch needed) and have them sorted + renamed.
