// Page UI. No dependencies, no build step: fetch the public GitHub API,
// keep a copy in localStorage, fall back to the committed snapshot.

import { API_URL, LOGIN, USER_API_URL, normalizeRepo, sortRepos } from './repo-index.js';

const SNAPSHOT_URL = './data/repos.json';
const SNAPSHOT_SCHEMA = 1;
const CACHE_KEY = 'vtd.index.v1';
const USER_KEY = 'vtd.user.v1';

const LANGUAGE_COLORS = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', HTML: '#e34c26', CSS: '#563d7c',
  SCSS: '#c6538c', Python: '#3572A5', Rust: '#dea584', Go: '#00ADD8',
  'C++': '#f34b7d', C: '#555555', 'C#': '#178600', Java: '#b07219',
  Shell: '#89e051', Lua: '#000080', GLSL: '#5686a5', Vue: '#41b883',
  Svelte: '#ff3e00', Dockerfile: '#384d54', Ruby: '#701516', PHP: '#4F5D95',
  Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB', Astro: '#ff5a03',
};

const els = {
  grid: document.getElementById('grid'),
  count: document.getElementById('count'),
  status: document.getElementById('status'),
  search: document.getElementById('search'),
  empty: document.getElementById('empty'),
  clear: document.getElementById('clear'),
  refresh: document.getElementById('refresh'),
  avatar: document.getElementById('avatar'),
  lede: document.getElementById('lede'),
};

const state = {
  repos: [],
  query: '',
  filter: 'all',
  updatedAt: null,
  fromSnapshot: false,
};

/* ---------------------------------------------------------------- helpers */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '#';
  } catch {
    return '#';
  }
}

function timeAgo(iso) {
  if (!iso) return 'a while ago';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'just now';
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.repos) || !data.repos.length) return null;
    return { repos: data.repos, updatedAt: data.savedAt || null };
  } catch {
    return null;
  }
}

function writeCache(repos, savedAt) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt, repos }));
  } catch {
    /* private mode or full quota: the page still works */
  }
}

async function readSnapshot() {
  try {
    const res = await fetch(SNAPSHOT_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.schema !== SNAPSHOT_SCHEMA || !Array.isArray(data.repos) || !data.repos.length) return null;
    return { repos: data.repos, updatedAt: data.generatedAt || null };
  } catch {
    return null;
  }
}

/* ----------------------------------------------------------------- render */

function visibleRepos() {
  const query = state.query.trim().toLowerCase();
  return state.repos.filter((repo) => {
    if (repo.isRoot) return false;
    if (state.filter === 'live' && !repo.pagesUrl) return false;
    if (state.filter === 'code' && repo.pagesUrl) return false;
    if (!query) return true;
    const haystack = [repo.name, repo.description, repo.language, ...repo.topics]
      .filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

function cardHTML(repo) {
  const target = safeUrl(repo.pagesUrl || repo.repoUrl);
  const badge = repo.pagesUrl
    ? '<span class="badge badge--live">live</span>'
    : repo.archived
      ? '<span class="badge">archived</span>'
      : '<span class="badge">repo</span>';

  const meta = [];
  if (repo.language) {
    const color = LANGUAGE_COLORS[repo.language] || '#98a0b3';
    meta.push(`<span class="meta__item"><i class="dot" style="--dot:${color}"></i>${esc(repo.language)}</span>`);
  }
  if (repo.stars) meta.push(`<span class="meta__item">★ ${esc(repo.stars)}</span>`);
  if (repo.pushedAt) meta.push(`<span class="meta__item">pushed ${esc(timeAgo(repo.pushedAt))}</span>`);
  if (repo.fork) meta.push('<span class="meta__item">fork</span>');

  const topics = repo.topics.length
    ? `<ul class="topics">${repo.topics.slice(0, 4).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`
    : '';

  return `
    <article class="card${repo.pagesUrl ? ' card--live' : ''}">
      <div class="card__head">
        <h2 class="card__title"><a href="${esc(safeUrl(repo.repoUrl))}" target="_blank" rel="noopener">${esc(repo.name)}</a></h2>
        ${badge}
      </div>
      <p class="card__desc">${repo.description ? esc(repo.description) : '<span class="muted">No description yet.</span>'}</p>
      ${topics}
      <div class="meta">${meta.join('')}</div>
      <div class="actions">
        ${repo.pagesUrl ? `<a class="btn btn--primary" href="${esc(safeUrl(repo.pagesUrl))}" target="_blank" rel="noopener">Visit page</a>` : ''}
        <a class="btn" href="${esc(safeUrl(repo.repoUrl))}" target="_blank" rel="noopener">Repo</a>
      </div>
    </article>`;
}

function skeletonHTML() {
  return Array.from({ length: 6 }, () => `
    <article class="card card--skeleton" aria-hidden="true">
      <div class="sk sk--title"></div>
      <div class="sk sk--line"></div>
      <div class="sk sk--line sk--short"></div>
      <div class="sk sk--meta"></div>
    </article>`).join('');
}

function render() {
  const shown = visibleRepos();
  const all = state.repos.filter((repo) => !repo.isRoot);
  const live = all.filter((repo) => repo.pagesUrl).length;

  els.grid.innerHTML = shown.map(cardHTML).join('');
  els.count.textContent = `${plural(live, 'live page')} · ${plural(all.length, 'repo')}`;
  els.empty.hidden = !(shown.length === 0 && all.length > 0);

  document.querySelectorAll('.chip').forEach((chip) => {
    chip.classList.toggle('is-active', chip.dataset.filter === state.filter);
  });
}

function setStatus(text, tone) {
  els.status.textContent = text;
  els.status.dataset.tone = tone || '';
}

/* ------------------------------------------------------------------- data */

const isRateLimit = (res) => res.status === 403 || res.status === 429;

async function loadLive({ quiet = false } = {}) {
  els.refresh.disabled = true;
  if (!quiet) setStatus('Fetching from GitHub…');
  try {
    const res = await fetch(API_URL, {
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) {
      throw new Error(isRateLimit(res)
        ? 'GitHub is rate-limiting this connection (60 requests an hour per IP).'
        : `GitHub API returned ${res.status}.`);
    }
    const raw = await res.json();
    if (!Array.isArray(raw)) throw new Error('Unexpected answer from the GitHub API.');

    state.repos = sortRepos(raw.map(normalizeRepo));
    state.updatedAt = new Date().toISOString();
    state.fromSnapshot = false;
    writeCache(state.repos, state.updatedAt);
    render();
    setStatus(`Live from the GitHub API · refreshed ${timeAgo(state.updatedAt)}`, 'ok');
  } catch (error) {
    if (state.repos.length) {
      const origin = state.fromSnapshot ? 'the committed snapshot' : 'cached data';
      setStatus(`${error.message} Showing ${origin} from ${timeAgo(state.updatedAt)}.`, 'warn');
    } else {
      els.grid.innerHTML = '';
      els.count.textContent = '';
      setStatus(`${error.message} Try the refresh button in a moment.`, 'error');
    }
  } finally {
    els.refresh.disabled = false;
  }
}

async function loadProfile() {
  try {
    const cached = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    if (cached && cached.bio && cached.savedAt && Date.now() - new Date(cached.savedAt).getTime() < 864e5) {
      applyProfile(cached);
    }
  } catch {
    /* ignore */
  }
  try {
    const res = await fetch(USER_API_URL, {
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return;
    const user = await res.json();
    const profile = { bio: user.bio || '', avatar: user.avatar_url || '', savedAt: new Date().toISOString() };
    applyProfile(profile);
    try { localStorage.setItem(USER_KEY, JSON.stringify(profile)); } catch { /* ignore */ }
  } catch {
    /* the hardcoded defaults in index.html stay */
  }
}

function applyProfile(profile) {
  if (profile.avatar) els.avatar.src = profile.avatar;
  if (profile.bio) els.lede.textContent = profile.bio;
}

function newest(a, b) {
  if (!a) return b;
  if (!b) return a;
  return new Date(a.updatedAt || 0) >= new Date(b.updatedAt || 0) ? a : b;
}

async function boot() {
  els.grid.innerHTML = skeletonHTML();

  const [snapshot, cached] = await Promise.all([readSnapshot(), Promise.resolve(readCache())]);
  const best = newest(cached, snapshot);
  if (best && best.repos.length) {
    state.repos = sortRepos(best.repos);
    state.updatedAt = best.updatedAt;
    state.fromSnapshot = best === snapshot;
    render();
    setStatus(`Showing ${state.fromSnapshot ? 'the committed snapshot' : 'cached data'} from ${timeAgo(state.updatedAt)} · checking for newer…`);
  }

  loadProfile();
  await loadLive({ quiet: Boolean(best) });
}

/* ----------------------------------------------------------------- events */

els.search.addEventListener('input', (event) => {
  state.query = event.target.value;
  render();
});

els.search.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    els.search.value = '';
    state.query = '';
    render();
  }
});

document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    state.filter = chip.dataset.filter;
    render();
  });
});

els.clear.addEventListener('click', () => {
  state.query = '';
  state.filter = 'all';
  els.search.value = '';
  render();
});

els.refresh.addEventListener('click', () => loadLive());

boot();
