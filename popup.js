const PR_PATH = /\/platform-preview\/(\d+)\//;

const titleEl = document.getElementById('title');
const metaEl = document.getElementById('meta');
const contentEl = document.getElementById('content');
const myPrsUsernameInput = document.getElementById('myPrsUsername');
const saveMyPrsUsernameBtn = document.getElementById('saveMyPrsUsername');
const tokenInput = document.getElementById('token');
const saveTokenBtn = document.getElementById('saveToken');
const notesEl = document.getElementById('notes');
const copyNotesBtn = document.getElementById('copyNotes');
const OWNER = 'OdenTech';
const REPO = 'platform';

let currentNotesPr = null;
let notesSaveTimer;

function notesKey(prNumber) {
  return `prPopupNotes_${prNumber}`;
}

async function loadNotes(prNumber) {
  if (!prNumber) {
    notesEl.value = '';
    notesEl.disabled = true;
    notesEl.placeholder = 'Open a preview URL with a PR number to save notes.';
    return;
  }
  notesEl.disabled = false;
  notesEl.placeholder = 'Your notes…';
  const key = notesKey(prNumber);
  const data = await chrome.storage.local.get(key);
  const v = data[key];
  notesEl.value = typeof v === 'string' ? v : '';
}

function setState(title, meta, body, isError) {
  titleEl.textContent = title;
  metaEl.textContent = meta;
  contentEl.textContent = body;
  contentEl.classList.toggle('err', !!isError);
}

async function getActiveTabUrl() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url ?? '';
}

async function getStoredToken() {
  const { githubToken } = await chrome.storage.local.get('githubToken');
  return typeof githubToken === 'string' ? githubToken.trim() : '';
}

async function loadMyPrsUsernameField() {
  const { myPrsUsername } = await chrome.storage.local.get('myPrsUsername');
  myPrsUsernameInput.value =
    typeof myPrsUsername === 'string' ? myPrsUsername : '';
}

async function fetchPr(prNumber, token) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/pulls/${prNumber}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text.slice(0, 200) };
  }
  if (!res.ok) {
    const msg = data.message || res.statusText || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

async function run() {
  await loadMyPrsUsernameField();
  const url = await getActiveTabUrl();
  const match = url.match(PR_PATH);
  const prNumber = match ? match[1] : null;
  currentNotesPr = prNumber;
  await loadNotes(prNumber);

  if (!prNumber) {
    setState(
      'No PR in this tab',
      'Open a page whose URL contains /platform-preview/<number>/',
      'Example: …/platform-preview/4115/assets/…',
      true
    );
    return;
  }
  const token = await getStoredToken();
  if (!token) {
    setState(
      `PR #${prNumber}`,
      'Add a GitHub token below to load the PR description.',
      '',
      false
    );
    return;
  }

  setState(`PR #${prNumber}`, 'Loading…', '');
  try {
    const pr = await fetchPr(prNumber, token);
    const desc = pr.body && String(pr.body).trim() ? pr.body : '(no description)';
    setState(pr.title || `Pull request #${prNumber}`, `github.com/${OWNER}/${REPO}/pull/${prNumber}`, desc, false);
  } catch (e) {
    setState(`PR #${prNumber}`, 'Could not load from GitHub', e.message || String(e), true);
  }
}

saveMyPrsUsernameBtn.addEventListener('click', async () => {
  const v = myPrsUsernameInput.value.trim();
  await chrome.storage.local.set({ myPrsUsername: v });
  await loadMyPrsUsernameField();
});

saveTokenBtn.addEventListener('click', async () => {
  const v = tokenInput.value.trim();
  await chrome.storage.local.set({ githubToken: v });
  tokenInput.value = '';
  await run();
});

notesEl.addEventListener('input', () => {
  if (currentNotesPr == null) return;
  clearTimeout(notesSaveTimer);
  notesSaveTimer = setTimeout(() => {
    chrome.storage.local.set({ [notesKey(currentNotesPr)]: notesEl.value });
  }, 400);
});

copyNotesBtn.addEventListener('click', async () => {
  await navigator.clipboard.writeText(notesEl.value);
});

run();
