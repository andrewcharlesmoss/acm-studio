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
function refresh() {
  const now = Date.now();
  for (const page of pages) {
    const due = !page.dataset.testScheduledAt || Date.parse(page.dataset.testScheduledAt) <= now;
    page.dataset.testAvailable = String(due);
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
if (pages.some(page => page.dataset.testScheduledAt)) { setInterval(() => { refresh(); dispatchEvent(new Event('hashchange')); }, 1000); }
})();`;
}
