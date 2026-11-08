// Regenerate data/repos.json from the GitHub API. Run by the scheduled
// workflow (.github/workflows/refresh-index.yml) so the page always has a
// committed snapshot to fall back on when the API rate-limits a visitor.

import { writeFile } from 'node:fs/promises';
import { API_URL, LOGIN, normalizeRepo, sortRepos } from '../assets/repo-index.js';

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('GITHUB_TOKEN is required (the workflow provides it automatically).');
  process.exit(1);
}

const res = await fetch(API_URL, {
  headers: {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': `${LOGIN}-pages-index`,
  },
});

if (!res.ok) {
  console.error(`GitHub API returned ${res.status}: ${(await res.text()).slice(0, 500)}`);
  process.exit(1);
}

const raw = await res.json();
if (!Array.isArray(raw)) {
  console.error('Unexpected payload from the GitHub API.');
  process.exit(1);
}

const repos = sortRepos(raw.map(normalizeRepo));
const payload = {
  schema: 1,
  generatedAt: new Date().toISOString(),
  login: LOGIN,
  repos,
};

const target = new URL('../data/repos.json', import.meta.url);
await writeFile(target, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

const live = repos.filter((repo) => repo.pagesUrl).length;
console.log(`Wrote ${repos.length} repos (${live} with a Pages site) to data/repos.json`);
