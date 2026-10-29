import { el } from '../../core/dom.js';
import { debugError } from '../../core/log.js';
import { isSignedIn } from '../../core/trakt.js';
import { playbackApi } from './api.js';
import { matchesRoute, olderThan } from './data.js';
import { CSS } from './styles.js';

const ID = 'ogt-playback';
const percent = (value) => `${Number(value.toFixed(1))}%`;
const button = (label, action) => el('button', { class: 'ogt-chip', type: 'button', text: label, dataset: { action } });

function createPanel(route) {
  const overview = route.name === 'progress';
  const kind = route.name === 'episode' ? 'episode' : 'movie';
  let destroyed = false;
  let busy = false;
  let items = [];
  let loaded = false;
  const selected = new Set();
  const status = el('p', { class: 'ogt-hint', role: 'status', 'aria-live': 'polite' });
  const content = el('div');
  const node = el('section', { id: ID, class: 'ogt-panel ogt-playback', 'aria-labelledby': `${ID}-title`, hidden: !overview },
    el('h2', { class: 'ogt-title', id: `${ID}-title`, text: overview ? 'Paused playback' : 'Playback progress' }),
    ...(overview ? [el('p', { class: 'ogt-hint', text: 'Your paused movies and episodes from the toolkit’s Trakt account.' }),
      button('Load paused playback', 'load')] : []), status, content);

  function alive() { return !destroyed && isSignedIn(); }
  function lock(next) {
    busy = next;
    node.setAttribute('aria-busy', String(next));
    for (const input of node.querySelectorAll('button, input')) input.disabled = next;
  }
  function render() {
    if (!alive()) return;
    content.replaceChildren();
    if (!overview) {
      const item = items.find((row) => matchesRoute(row, route));
      node.hidden = !item;
      if (!item) return;
      const clear = button('Clear', 'one');
      clear.dataset.id = String(item.id);
      content.append(el('div', { class: 'ogt-playback__tools' },
        el('span', { text: `${percent(item.progress)} paused` }),
        el('progress', { class: 'ogt-playback__meter', max: 100, value: item.progress, 'aria-label': 'Saved playback progress' }), clear));
      return;
    }
    node.querySelector('[data-action="load"]').textContent = loaded ? 'Refresh paused playback' : 'Load paused playback';
    if (!loaded) return;
    for (const id of selected) if (!items.some((row) => row.id === id)) selected.delete(id);
    if (!items.length) { content.append(el('p', { class: 'ogt-hint', text: 'No paused playback.' })); return; }
    const all = el('input', { type: 'checkbox', dataset: { action: 'all' }, checked: items.every((row) => selected.has(row.id)), 'aria-label': 'Select all paused items' });
    const tools = el('div', { class: 'ogt-playback__tools' },
      el('label', {}, all, ' Select all'), button('Clear selected', 'selected'),
      el('label', {}, 'Older than ', el('input', { class: 'ogt-select ogt-playback__days', type: 'number', min: 0, step: 1, value: 30, 'aria-label': 'Age in days' }), ' days'),
      button('Clear older items', 'age'));
    const list = el('ul', { class: 'ogt-playback__list' });
    for (const item of items) {
      const clear = button('Clear', 'one'); clear.dataset.id = String(item.id);
      const poster = item.poster ? el('img', { class: 'ogt-playback__poster', src: item.poster, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }) :
        el('span', { class: 'ogt-playback__poster', 'aria-hidden': true });
      list.append(el('li', { class: 'ogt-playback__item' },
        el('input', { type: 'checkbox', dataset: { id: item.id, action: 'select' }, checked: selected.has(item.id), 'aria-label': `Select ${item.title}` }), poster,
        el('div', { class: 'ogt-playback__details' }, el('a', { href: item.href, text: item.title }),
          el('span', { text: ` · ${percent(item.progress)}` }),
          el('time', { class: 'ogt-playback__date', datetime: item.pausedAt, text: `Paused ${new Date(item.pausedMs).toLocaleString()}` })), clear));
    }
    content.append(tools, list);
  }
  async function read(force = false) {
    items = overview ? await playbackApi.loadAll({ force }) : await playbackApi.load(kind, { force });
    if (!alive()) return;
    loaded = true;
    render();
  }
  async function clear(ids) {
    if (!ids.length) { status.textContent = 'No paused items selected.'; return; }
    const result = await playbackApi.clearItems(ids, (message) => window.confirm(message));
    if (result.cancelled || !alive()) return;
    selected.clear();
    const summary = `${result.cleared.length} cleared${result.failed.length ? `; ${result.failed.length} failed — try again` : ''}.`;
    // Never leave deleted rows displayed as if they were still current.
    items = []; render();
    try { await read(true); status.textContent = summary; }
    catch (error) {
      debugError('playback refresh failed', error);
      if (alive()) status.textContent = `${summary} Could not refresh playback; try Refresh.`;
    }
  }
  async function onClick(event) {
    const target = event.target.closest('button[data-action]');
    if (!target || !node.contains(target) || busy || !alive()) return;
    const action = target.dataset.action;
    lock(true);
    try {
      if (action === 'load') {
        status.textContent = 'Loading paused playback…';
        await read(true);
        if (alive()) status.textContent = '';
      } else if (action === 'one') await clear([Number(target.dataset.id)]);
      else if (action === 'selected') await clear([...selected]);
      else if (action === 'age') {
        const days = node.querySelector('[aria-label="Age in days"]').value;
        if (days.trim() === '' || !Number.isInteger(Number(days)) || Number(days) < 0) {
          status.textContent = 'Enter a whole number of days, zero or greater.';
        } else await clear(olderThan(items, days).map((row) => row.id));
      }
    } catch (error) {
      debugError('playback request failed', error);
      if (alive()) status.textContent = 'Could not load paused playback; try again.';
    } finally { if (alive()) lock(false); }
  }
  function onChange(event) {
    const input = event.target;
    if (input.dataset.action === 'all') {
      selected.clear();
      if (input.checked) for (const row of items) selected.add(row.id);
      for (const box of node.querySelectorAll('[data-action="select"]')) box.checked = input.checked;
    } else if (input.dataset.action === 'select') {
      if (input.checked) selected.add(Number(input.dataset.id));
      else selected.delete(Number(input.dataset.id));
      node.querySelector('[data-action="all"]').checked = items.every((row) => selected.has(row.id));
    }
  }
  node.addEventListener('click', onClick);
  node.addEventListener('change', onChange);
  if (!overview) {
    read().catch((error) => { if (alive()) debugError('playback badge lookup failed', error); });
  }
  return { node, destroy() {
    destroyed = true;
    node.removeEventListener('click', onClick);
    node.removeEventListener('change', onChange);
    node.remove();
  } };
}

export const playback = {
  id: 'playback', css: CSS,
  match(route) {
    return isSignedIn() && (route.name === 'progress' || route.kind === 'movie' && route.name === 'title' || route.name === 'episode');
  },
  mount(route) {
    if (document.getElementById(ID)) return null;
    const anchor = route.name === 'progress' ? document.querySelector('section.progress') :
      document.querySelector('.summary-frame #overview .top');
    if (!anchor?.parentElement) return null;
    const panel = createPanel(route);
    anchor.parentElement.insertBefore(panel.node, route.name === 'progress' ? anchor : anchor.nextSibling);
    return panel;
  },
};
