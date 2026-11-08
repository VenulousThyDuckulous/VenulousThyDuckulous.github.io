// Shared repo/pages logic. Imported by the browser (assets/app.js) and by
// scripts/update-repos.mjs, so both agree on URLs, ordering and shape.

export const LOGIN = 'VenulousThyDuckulous';
export const SITE_ORIGIN = `https://${LOGIN.toLowerCase()}.github.io`;
export const ROOT_REPO = `${LOGIN.toLowerCase()}.github.io`;

export const API_URL =
  `https://api.github.com/users/${LOGIN}/repos?per_page=100&type=owner&sort=pushed&direction=desc`;
export const USER_API_URL = `https://api.github.com/users/${LOGIN}`;

/** Where a repo's GitHub Pages site lives, or null when it has none. */
export function pagesUrlFor(name, hasPages) {
  if (!hasPages) return null;
  if (name.toLowerCase() === ROOT_REPO) return `${SITE_ORIGIN}/`;
  return `${SITE_ORIGIN}/${encodeURIComponent(name)}/`;
}

/** Turn a raw GitHub repository object into what the page renders. */
export function normalizeRepo(repo) {
  const name = String(repo.name || '');
  const isRoot = name.toLowerCase() === ROOT_REPO;
  return {
    name,
    description: repo.description || '',
    repoUrl: repo.html_url || `https://github.com/${LOGIN}/${name}`,
    pagesUrl: pagesUrlFor(name, Boolean(repo.has_pages)),
    homepage: repo.homepage || '',
    language: repo.language || '',
    topics: Array.isArray(repo.topics) ? repo.topics.slice(0, 6) : [],
    stars: Number(repo.stargazers_count) || 0,
    forks: Number(repo.forks_count) || 0,
    pushedAt: repo.pushed_at || repo.updated_at || null,
    archived: Boolean(repo.archived),
    fork: Boolean(repo.fork),
    isRoot,
  };
}

/** Live pages first, then most recently pushed. */
export function compareRepos(a, b) {
  if (Boolean(a.pagesUrl) !== Boolean(b.pagesUrl)) return a.pagesUrl ? -1 : 1;
  return new Date(b.pushedAt || 0) - new Date(a.pushedAt || 0);
}

export function sortRepos(repos) {
  return [...repos].sort(compareRepos);
}
