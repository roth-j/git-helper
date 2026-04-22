const PR_PATH = /\/platform-preview\/(\d+)\//;

const ATTACHMENTS_BRANCH = 'git-copy-note-media';
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

const titleEl = document.getElementById('title');
const metaEl = document.getElementById('meta');
const contentEl = document.getElementById('content');
const settingsToggle = document.getElementById('settingsToggle');
const settingsPanel = document.getElementById('settingsPanel');
const myPrsUsernameInput = document.getElementById('myPrsUsername');
const saveMyPrsUsernameBtn = document.getElementById('saveMyPrsUsername');
const tokenInput = document.getElementById('token');
const saveTokenBtn = document.getElementById('saveToken');
const notesEl = document.getElementById('notes');
const copyNotesBtn = document.getElementById('copyNotes');
const postNotesBtn = document.getElementById('postNotes');
const notesPostFeedbackEl = document.getElementById('notesPostFeedback');
const noteAttachmentsInput = document.getElementById('noteAttachments');
const attachImagesBtn = document.getElementById('attachImagesBtn');
const attachmentChipsEl = document.getElementById('attachmentChips');

const OWNER = 'OdenTech';
const REPO = 'platform';

let currentNotesPr = null;
let notesSaveTimer;

const pendingImages = [];

function notesKey(prNumber) {
  return `prPopupNotes_${prNumber}`;
}

function updatePostButtonState() {
  if (currentNotesPr == null || notesEl.disabled) {
    postNotesBtn.disabled = true;
    return;
  }
  const hasText = notesEl.value.trim().length > 0;
  postNotesBtn.disabled = !hasText && pendingImages.length === 0;
}

function renderAttachmentChips() {
  attachmentChipsEl.replaceChildren();
  pendingImages.forEach((item, index) => {
    const wrap = document.createElement('div');
    wrap.className = 'attachment-chip';
    const img = document.createElement('img');
    img.src = item.url;
    img.alt = item.file.name;
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'attachment-chip-remove';
    rm.setAttribute('aria-label', 'Remove image');
    rm.textContent = '×';
    rm.addEventListener('click', () => {
      URL.revokeObjectURL(item.url);
      pendingImages.splice(index, 1);
      renderAttachmentChips();
      updatePostButtonState();
    });
    wrap.appendChild(img);
    wrap.appendChild(rm);
    attachmentChipsEl.appendChild(wrap);
  });
}

function clearAttachments() {
  for (const item of pendingImages) {
    URL.revokeObjectURL(item.url);
  }
  pendingImages.length = 0;
  renderAttachmentChips();
  updatePostButtonState();
}

function addPendingImageFiles(fileList) {
  const list = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
  for (const file of list) {
    if (file.size > MAX_IMAGE_BYTES) continue;
    pendingImages.push({ file, url: URL.createObjectURL(file) });
  }
  renderAttachmentChips();
  updatePostButtonState();
}

async function loadNotes(prNumber) {
  if (!prNumber) {
    notesEl.value = '';
    notesEl.disabled = true;
    notesEl.placeholder = 'Open a preview URL with a PR number to save notes.';
    postNotesBtn.disabled = true;
    clearAttachments();
    attachImagesBtn.disabled = true;
    noteAttachmentsInput.disabled = true;
    return;
  }
  notesEl.disabled = false;
  notesEl.placeholder = 'Your notes…';
  attachImagesBtn.disabled = false;
  noteAttachmentsInput.disabled = false;
  clearAttachments();
  const key = notesKey(prNumber);
  const data = await chrome.storage.local.get(key);
  const v = data[key];
  notesEl.value = typeof v === 'string' ? v : '';
  updatePostButtonState();
}

function setState(title, meta, body, isError, options = {}) {
  const { asMarkdown = false } = options;
  titleEl.textContent = title;
  metaEl.textContent = meta;
  contentEl.classList.toggle('err', !!isError);
  contentEl.classList.toggle('markdown-body', !isError && asMarkdown);
  if (isError || !asMarkdown) {
    contentEl.textContent = body;
    return;
  }
  const raw =
    typeof marked !== 'undefined' && typeof marked.parse === 'function'
      ? marked.parse(String(body), { async: false })
      : '';
  contentEl.innerHTML =
    typeof DOMPurify !== 'undefined' && typeof DOMPurify.sanitize === 'function'
      ? DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } })
      : raw;
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

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.byteLength; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, Math.min(i + chunk, bytes.byteLength))
    );
  }
  return btoa(binary);
}

function encodeRepoContentPath(path) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

async function ensureAttachmentsBranch(token) {
  const repoRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  const repoText = await repoRes.text();
  let repoData;
  try {
    repoData = JSON.parse(repoText);
  } catch {
    repoData = { message: repoText.slice(0, 200) };
  }
  if (!repoRes.ok) {
    throw new Error(repoData.message || `HTTP ${repoRes.status}`);
  }
  const defaultBranch = repoData.default_branch;
  const refRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/git/ref/heads/${encodeURIComponent(defaultBranch)}`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );
  const refText = await refRes.text();
  let refData;
  try {
    refData = JSON.parse(refText);
  } catch {
    refData = { message: refText.slice(0, 200) };
  }
  if (!refRes.ok) {
    throw new Error(refData.message || `HTTP ${refRes.status}`);
  }
  const sha = refData.object.sha;
  const createRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/refs`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref: `refs/heads/${ATTACHMENTS_BRANCH}`, sha }),
  });
  if (createRes.ok || createRes.status === 422) return;
  const errText = await createRes.text();
  let errData;
  try {
    errData = JSON.parse(errText);
  } catch {
    errData = { message: errText.slice(0, 200) };
  }
  throw new Error(errData.message || `Could not prepare image uploads (${createRes.status})`);
}

async function uploadNoteImage(token, prNumber, file) {
  await ensureAttachmentsBranch(token);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = (file.name.split('.').pop() || 'png').replace(/[^a-zA-Z0-9]/g, '') || 'png';
  const path = `note-media/pr-${prNumber}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeRepoContentPath(path)}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `PR #${prNumber} comment image`,
      content: bytesToBase64(bytes),
      branch: ATTACHMENTS_BRANCH,
    }),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text.slice(0, 200) };
  }
  if (!res.ok) {
    throw new Error(data.message || `Image upload failed (${res.status})`);
  }
  const dl = data.content && data.content.download_url;
  if (!dl) {
    throw new Error('Upload succeeded but no download URL was returned.');
  }
  return dl;
}

async function postIssueComment(prNumber, token, body) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues/${prNumber}/comments`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body }),
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
      'Add a GitHub token in settings (⚙️) to load the PR description.',
      '',
      false
    );
    return;
  }

  setState(`PR #${prNumber}`, 'Loading…', '', false);
  try {
    const pr = await fetchPr(prNumber, token);
    const desc = pr.body && String(pr.body).trim() ? pr.body : '(no description)';
    setState(pr.title || `Pull request #${prNumber}`, `github.com/${OWNER}/${REPO}/pull/${prNumber}`, desc, false, {
      asMarkdown: true,
    });
  } catch (e) {
    setState(`PR #${prNumber}`, 'Could not load from GitHub', e.message || String(e), true);
  }
}

settingsToggle.addEventListener('click', () => {
  const open = settingsPanel.hidden;
  settingsPanel.hidden = !open;
  settingsToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
});

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
  updatePostButtonState();
});

['dragenter', 'dragover'].forEach((evt) => {
  notesEl.addEventListener(evt, (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
});

notesEl.addEventListener('drop', (e) => {
  e.preventDefault();
  if (notesEl.disabled) return;
  addPendingImageFiles(e.dataTransfer.files);
});

attachImagesBtn.addEventListener('click', () => {
  noteAttachmentsInput.click();
});

noteAttachmentsInput.addEventListener('change', () => {
  addPendingImageFiles(noteAttachmentsInput.files);
  noteAttachmentsInput.value = '';
});

copyNotesBtn.addEventListener('click', async () => {
  await navigator.clipboard.writeText(notesEl.value);
});

postNotesBtn.addEventListener('click', async () => {
  notesPostFeedbackEl.textContent = '';
  notesPostFeedbackEl.classList.remove('err');
  if (currentNotesPr == null || notesEl.disabled) return;
  let body = notesEl.value.trim();
  if (!body && pendingImages.length === 0) return;
  const token = await getStoredToken();
  if (!token) {
    notesPostFeedbackEl.textContent = 'Add a GitHub token to post comments.';
    notesPostFeedbackEl.classList.add('err');
    return;
  }
  postNotesBtn.disabled = true;
  attachImagesBtn.disabled = true;
  noteAttachmentsInput.disabled = true;
  try {
    const lines = [];
    for (const { file } of pendingImages) {
      const dl = await uploadNoteImage(token, currentNotesPr, file);
      const alt = file.name.replace(/[[\]]/g, '');
      lines.push(`![${alt}](${dl})`);
    }
    if (lines.length) {
      body = [body, ...lines].filter(Boolean).join('\n\n');
    }
    await postIssueComment(currentNotesPr, token, body);
    clearTimeout(notesSaveTimer);
    notesEl.value = '';
    clearAttachments();
    await chrome.storage.local.remove(notesKey(currentNotesPr));
  } catch (e) {
    notesPostFeedbackEl.textContent = e.message || String(e);
    notesPostFeedbackEl.classList.add('err');
  } finally {
    attachImagesBtn.disabled = !(currentNotesPr && !notesEl.disabled);
    noteAttachmentsInput.disabled = attachImagesBtn.disabled;
    postNotesBtn.disabled = !(currentNotesPr && !notesEl.disabled);
    updatePostButtonState();
  }
});

run();
