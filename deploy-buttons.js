const WRAPPER_MARK = 'data-rgh-deploy-buttons';
const APPROVE_PLUS_MARK = 'data-rgh-approve-plus';
const PR_PATH = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)/;

function getPrContext() {
  const m = window.location.pathname.match(PR_PATH);
  return m ? { owner: m[1], repo: m[2], number: m[3] } : null;
}

const BROKEN_ROBOT_SVG = '<svg aria-hidden="true" focusable="false" width="26" height="26" viewBox="0 0 200 200" fill="currentColor"><rect x="40" y="40" width="120" height="100" rx="14" fill="white" stroke="currentColor" stroke-width="4"/><line x1="100" y1="40" x2="100" y2="20" stroke="currentColor" stroke-width="4"/><circle cx="100" cy="15" r="5" fill="currentColor"/><path d="M95 40 L85 65 L105 85 L90 110 L100 140" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><circle cx="75" cy="80" r="10" fill="currentColor"/><circle cx="125" cy="80" r="10" fill="none" stroke="currentColor" stroke-width="4"/><line x1="118" y1="73" x2="132" y2="87" stroke="currentColor" stroke-width="3"/><line x1="132" y1="73" x2="118" y2="87" stroke="currentColor" stroke-width="3"/><rect x="75" y="105" width="50" height="10" rx="2" fill="currentColor"/><path d="M160 95 C180 95, 180 130, 150 130" fill="none" stroke="currentColor" stroke-width="3"/></svg>';
const WORKING_ROBOT_SVG = '<svg aria-hidden="true" focusable="false" width="26" height="26" viewBox="0 0 200 200" fill="currentColor"><rect x="40" y="40" width="120" height="100" rx="14" fill="white" stroke="currentColor" stroke-width="4"/><line x1="100" y1="40" x2="100" y2="20" stroke="currentColor" stroke-width="4"/><circle cx="100" cy="15" r="5" fill="currentColor"/><path d="M88 18 Q100 5 112 18" fill="none" stroke="currentColor" stroke-width="2"/><path d="M82 14 Q100 -4 118 14" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="75" cy="80" r="10" fill="currentColor"/><circle cx="125" cy="80" r="10" fill="currentColor"/><rect x="70" y="105" width="60" height="14" rx="2" fill="white" stroke="currentColor" stroke-width="3"/><line x1="80" y1="105" x2="80" y2="119" stroke="currentColor" stroke-width="2"/><line x1="90" y1="105" x2="90" y2="119" stroke="currentColor" stroke-width="2"/><line x1="100" y1="105" x2="100" y2="119" stroke="currentColor" stroke-width="2"/><line x1="110" y1="105" x2="110" y2="119" stroke="currentColor" stroke-width="2"/><line x1="120" y1="105" x2="120" y2="119" stroke="currentColor" stroke-width="2"/><circle cx="40" cy="90" r="6" fill="white" stroke="currentColor" stroke-width="3"/><circle cx="160" cy="90" r="6" fill="white" stroke="currentColor" stroke-width="3"/></svg>';

function getPrNumber() {
  return getPrContext()?.number ?? null;
}

function isPrPage() {
  return getPrNumber() !== null;
}

function createRoundLink(svgHtml, url, label) {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.setAttribute('aria-label', label);
  a.innerHTML = svgHtml;
  a.style.cssText = [
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'width:44px',
    'height:44px',
    'border-radius:50%',
    'background:#fff',
    'color:#24292f',
    'text-decoration:none',
    'box-shadow:0 2px 10px rgba(0,0,0,0.18),0 0 0 1px rgba(31,35,40,0.12)',
    'cursor:pointer',
  ].join(';');
  a.addEventListener('mouseenter', () => {
    a.style.boxShadow = '0 4px 14px rgba(0,0,0,0.22),0 0 0 1px rgba(31,35,40,0.16)';
  });
  a.addEventListener('mouseleave', () => {
    a.style.boxShadow = '0 2px 10px rgba(0,0,0,0.18),0 0 0 1px rgba(31,35,40,0.12)';
  });
  return a;
}

function createApprovePlusButton() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute(APPROVE_PLUS_MARK, '');
  btn.setAttribute('aria-label', 'Approve pull request with review body /approve++');
  btn.textContent = '++';
  const baseShadow = '0 2px 10px rgba(0,0,0,0.18),0 0 0 1px rgba(31,35,40,0.12)';
  btn.style.cssText = [
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'width:44px',
    'height:44px',
    'border-radius:50%',
    'border:0',
    'padding:0',
    'background:#fff',
    'color:#24292f',
    'font-size:15px',
    'font-weight:700',
    'font-family:ui-sans-serif,system-ui,sans-serif',
    'box-shadow:' + baseShadow,
    'cursor:pointer',
  ].join(';');
  btn.addEventListener('mouseenter', () => {
    btn.style.boxShadow = '0 4px 14px rgba(0,0,0,0.22),0 0 0 1px rgba(31,35,40,0.16)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.boxShadow = baseShadow;
  });
  btn.addEventListener('click', () => {
    void runApprovePlus(btn);
  });
  return btn;
}

async function runApprovePlus(button) {
  const ctx = getPrContext();
  if (!ctx) return;
  const { githubToken } = await chrome.storage.local.get('githubToken');
  const token = typeof githubToken === 'string' ? githubToken.trim() : '';
  if (!token) {
    window.alert('Save a GitHub token in the extension popup first.');
    return;
  }
  const prevDisabled = button.disabled;
  const prevText = button.textContent;
  button.disabled = true;
  button.textContent = '…';
  try {
    const url = `https://api.github.com/repos/${ctx.owner}/${ctx.repo}/pulls/${ctx.number}/reviews`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event: 'APPROVE', body: '/approve++' }),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text.slice(0, 400) };
    }
    if (!res.ok) {
      const msg =
        data.message ||
        (Array.isArray(data.errors) && data.errors[0] && data.errors[0].message) ||
        `HTTP ${res.status}`;
      throw new Error(msg);
    }
    window.location.reload();
  } catch (e) {
    window.alert(e instanceof Error ? e.message : String(e));
  } finally {
    button.disabled = prevDisabled;
    button.textContent = prevText;
  }
}

function ensureApprovePlusButton(root) {
  if (root.querySelector(`button[${APPROVE_PLUS_MARK}]`)) return;
  root.appendChild(createApprovePlusButton());
}

function getFloatingRoot() {
  return document.querySelector(`div[${WRAPPER_MARK}]`);
}

function renderDeployButtons() {
  const pr = getPrNumber();
  const existing = getFloatingRoot();

  if (!pr) {
    existing?.remove();
    return;
  }

  const qaUrl = `https://api.oden-qa.app/platform/file-storage/platform-preview/${pr}/`;
  const prodUrl = `https://api.oden.app/platform/file-storage/platform-preview/${pr}/`;

  let root = existing;
  if (!root) {
    root = document.createElement('div');
    root.setAttribute(WRAPPER_MARK, '');
    root.style.cssText = [
      'position:fixed',
      'top:60px',
      'right:16px',
      'z-index:2147483647',
      'display:flex',
      'flex-direction:column',
      'gap:10px',
      'pointer-events:auto',
    ].join(';');
    document.body.appendChild(root);
    root.appendChild(createRoundLink(BROKEN_ROBOT_SVG, qaUrl, 'Open QA preview'));
    root.appendChild(createRoundLink(WORKING_ROBOT_SVG, prodUrl, 'Open production preview'));
    ensureApprovePlusButton(root);
    return;
  }

  const links = root.querySelectorAll('a');
  if (links[0]) links[0].href = qaUrl;
  if (links[1]) links[1].href = prodUrl;
  ensureApprovePlusButton(root);
}

function initDeployButtons() {
  renderDeployButtons();
  let lastPath = location.pathname;
  const observer = new MutationObserver(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      renderDeployButtons();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDeployButtons);
} else {
  initDeployButtons();
}
