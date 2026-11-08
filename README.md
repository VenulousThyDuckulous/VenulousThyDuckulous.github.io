# venulousthyduckulous.github.io

The index page at **https://venulousthyduckulous.github.io** — every live GitHub Pages site
and every repository in one place.

## How it stays up to date

- **In the browser.** The page calls the public GitHub API
  (`/users/VenulousThyDuckulous/repos`) on every visit, caches the result in
  `localStorage`, and rebuilds the list. Push a repo, enable Pages, or rename
  something and it shows up on the next load.
- **In the repo.** `.github/workflows/refresh-index.yml` regenerates
  `data/repos.json` every six hours (and on every push to `main`) with a
  GitHub token, so there is always a recent committed snapshot.
- **Fallback.** If GitHub rate-limits a visitor's IP address, the page quietly
  falls back to the snapshot without a broken state.

Which repos appear: all public repos you own. A repo gets a **live** badge and a
"Visit page" button when GitHub Pages is enabled for it, linking to
`https://venulousthyduckulous.github.io/<repo>/`.

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | Page shell, hero, toolbar |
| `assets/app.js` | Fetching, caching, filtering, rendering |
| `assets/repo-index.js` | Shared repo → card normalization and URLs (browser + Node) |
| `assets/styles.css` | Styles |
| `scripts/update-repos.mjs` | Writes `data/repos.json` |
| `data/repos.json` | Committed snapshot, refreshed by the workflow |

## Local preview

No build step, no dependencies:

```sh
python3 -m http.server 3000
# then open http://localhost:3000
```

Pull requests and issues are welcome, but this is mostly a personal index.
