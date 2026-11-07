import { passwordVerificationScript } from "../../content/password-protection";

/** Local display timing and password gates; editorial source is still local plaintext. */
export function localPublicationScript() {
  return `(()=>{
${passwordVerificationScript()}
const pages = Array.from(document.querySelectorAll('[data-test-document]'));
function reveal(page) {
  const source = page.querySelector('template[data-test-publication-body]');
  if (!source || page.dataset.testLocked === 'true') return;
  source.replaceWith(source.content.cloneNode(true));
  document.dispatchEvent(new Event('acm-local-publication-revealed'));
}
function refreshQueries() {
  const now = Date.now();
  for (const query of document.querySelectorAll('.content-query-loop[data-query-count]')) {
    for (const candidate of query.querySelectorAll(':scope > template[data-query-scheduled-candidate]')) {
      const availableAt = Number(candidate.dataset.queryScheduledCandidate);
      if (!Number.isFinite(availableAt) || availableAt > now) continue;
      const post = candidate.content.firstElementChild?.cloneNode(true);
      if (!post) { candidate.remove(); continue; }
      query.append(post);
      candidate.remove();
    }
    const order = query.dataset.queryOrder === 'asc' ? 1 : -1;
    const stickyFirst = query.dataset.queryStickyFirst === 'true';
    const count = Math.max(1, Math.min(100, Number(query.dataset.queryCount) || 1));
    const candidates = Array.from(query.querySelectorAll(':scope > [data-query-post-id]'));
    candidates.sort((a, b) => {
      if (stickyFirst && a.dataset.querySticky !== b.dataset.querySticky) return a.dataset.querySticky === 'true' ? -1 : 1;
      const date = Date.parse(a.dataset.queryPublishedAt) - Date.parse(b.dataset.queryPublishedAt);
      if (Number.isFinite(date) && date) return date * order;
      return a.dataset.queryPostId < b.dataset.queryPostId ? -1 : a.dataset.queryPostId > b.dataset.queryPostId ? 1 : 0;
    });
    const visible = candidates.filter(candidate => {
      const publishedAt = Date.parse(candidate.dataset.queryPublishedAt);
      return Number.isFinite(publishedAt) && publishedAt <= now;
    }).slice(0, count);
    for (const candidate of candidates) {
      query.append(candidate);
      candidate.hidden = !visible.includes(candidate);
    }
    const empty = query.querySelector('[data-query-no-results]');
    if (empty) empty.hidden = visible.length > 0;
  }
}
function refresh() {
  const now = Date.now();
  for (const page of pages) {
    const due = !page.dataset.testScheduledAt || Date.parse(page.dataset.testScheduledAt) <= now;
    page.dataset.testAvailable = String(due);
    page.dataset.testSearchable = String(due && page.dataset.testProtected !== "true");
    const notice = page.querySelector('[data-test-schedule-notice]');
    if (notice) notice.hidden = due;
    const gate = page.querySelector('[data-test-password-gate]');
    if (gate) gate.hidden = !due || page.dataset.testLocked !== 'true';
    if (due) reveal(page);
  }
  for (const link of document.querySelectorAll('a[href]')) {
    const href = link.getAttribute('href');
    if (!href?.startsWith('/#document=') && !href?.startsWith('#document=')) continue;
    let id; try { id = decodeURIComponent(href.slice(href.indexOf('=') + 1)); } catch { continue; }
    const target = pages.find(page => page.dataset.testDocument === id);
    const item = link.closest('li') || link;
    item.hidden = !target || target.dataset.testAvailable !== 'true';
  }
  refreshQueries();
}
document.addEventListener('submit', async event => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.matches('[data-test-password-form]')) return;
  event.preventDefault();
  const page = form.closest('[data-test-document]');
  const input = form.querySelector('input');
  const button = form.querySelector('[type=submit]');
  const error = form.querySelector('[role=alert]');
  if (!page || !input || !button) return;
  button.disabled = true;
  const valid = await verifyPassword(input.value, { salt: page.dataset.testPasswordSalt, hash: page.dataset.testPasswordHash });
  input.value = '';
  button.disabled = false;
  if (!valid) { error.textContent = 'That password is incorrect.'; input.focus(); return; }
  page.dataset.testLocked = 'false';
  refresh();
  page.focus();
});
document.addEventListener('click', event => {
  const toggle = event.target instanceof Element ? event.target.closest('[data-test-password-toggle]') : null;
  if (!toggle) return;
  const input = toggle.parentElement.querySelector('input');
  const visible = input.type === 'password';
  input.type = visible ? 'text' : 'password';
  toggle.setAttribute('aria-pressed', String(visible));
  toggle.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
  toggle.title = visible ? 'Hide password' : 'Show password';
  toggle.querySelector('[data-test-password-show]').hidden = visible;
  toggle.querySelector('[data-test-password-hide]').hidden = !visible;
});
refresh();
if (pages.some(page => page.dataset.testScheduledAt) || document.querySelector('[data-query-scheduled-candidate]')) { setInterval(() => { refresh(); dispatchEvent(new Event('hashchange')); }, 1000); }
})();`;
}
