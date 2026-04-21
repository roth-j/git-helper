const DEFAULT_MY_PRS_AUTHOR = 'roth-j';

async function getMyPrsSearchUrl() {
  const { myPrsUsername } = await chrome.storage.local.get('myPrsUsername');
  const user =
    typeof myPrsUsername === 'string' && myPrsUsername.trim()
      ? myPrsUsername.trim()
      : DEFAULT_MY_PRS_AUTHOR;
  const q = `sort:updated-desc is:pr is:open author:${user}`;
  return `https://github.com/OdenTech/platform/pulls?${new URLSearchParams({ q }).toString()}`;
}

function createEelIcon() {
  const span = document.createElement('span');
  span.setAttribute('data-component', 'icon');
  span.innerHTML = `<svg aria-hidden="true" focusable="false" viewBox="0 0 511.998 511.998" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align: text-bottom"><g><circle cx="388.179" cy="406.825" r="9.062"/></g><g><path d="M458.557,410.036c-3.609-4.974-36.081-48.597-64.651-48.597H213.845c-12.573,0-22.802-10.229-22.802-22.802v-5.971c0-12.573,10.229-22.802,22.802-22.802H316.28c72.534,0,131.545-59.011,131.545-131.546v-2.466c0-53.335-32.133-99.301-78.053-119.574c0.76-8.814,0.229-23.435-8.81-35.806c-8.924-12.213-23.56-19.08-43.509-20.415C317.238,0.043,315.505,0,315.505,0H153.722c-3.532,0-6.765,2.024-8.248,5.23c-1.483,3.206-0.991,6.953,1.295,9.644c1.261,1.535,11.297,14.596,2.124,30.341H60.777c-3.685,0-7.003,2.232-8.393,5.643c-1.39,3.413-0.574,7.328,2.062,9.901l37.848,36.959l-38.152,41.004c-2.456,2.639-3.114,6.485-1.674,9.791c1.44,3.306,4.702,5.444,8.307,5.444h255.503c12.573,0,22.801,10.229,22.801,22.801v1.559c0,12.573-10.229,22.802-22.802,22.802H213.842c-72.534,0-131.545,59.011-131.545,131.545v5.971c0,71.284,56.994,129.502,127.805,131.489l40.372,39.304c1.698,1.654,3.969,2.569,6.321,2.569c0.225,0,0.452-0.008,0.679-0.025c2.591-0.194,4.973-1.491,6.542-3.56l29.002-38.231h100.888c28.57,0,61.044-43.623,64.652-48.597c1.123-1.547,1.726-3.41,1.726-5.322v-0.906C460.284,413.447,459.681,411.583,458.557,410.036z M315.976,18.124c14.435,0.921,24.621,5.276,30.283,12.948c4.384,5.941,5.557,13.133,5.639,18.833c-11.058-3.052-22.697-4.69-34.712-4.69H168.68c3.239-9.951,2.403-19.382-0.05-27.092H315.976z M255.773,489.294l-19.629-19.11h34.126L255.773,489.294z M213.845,452.061c-62.541-0.001-113.422-50.882-113.422-113.423v-5.971c0-62.541,50.881-113.422,113.422-113.422H316.28c22.566,0,40.926-18.36,40.926-40.926v-1.559c0-22.566-18.36-40.925-40.925-40.925H81.587l30.002-32.246c3.351-3.601,3.216-9.219-0.304-12.656L83.028,63.341h234.158c62.04,0,112.515,50.474,112.515,112.514v2.466c0,62.541-50.881,113.422-113.422,113.422H213.845c-22.567,0-40.926,18.359-40.926,40.926v5.971c0,22.567,18.359,40.926,40.926,40.926h109.331c-2.106,4.304-4.175,9.426-5.743,15.232c-3.783,14.013-5.206,34.397,6.075,57.264H213.845z M393.905,452.06h-49.606c-22.129-34.533-6.682-63.183-0.3-72.496h49.905c13.216,0,33.889,20.556,46.285,36.247C427.794,431.505,407.122,452.06,393.905,452.06z"/></g></svg>`;
  return span;
}

async function ensureMyPrsTab() {
  const prTab = document.querySelector('a[data-tab-item="pull-requests"]');
  if (!prTab) return;

  const myPrsUrl = await getMyPrsSearchUrl();
  const existing = document.querySelector('a[data-tab-item="my-pull-requests"]');
  if (existing) {
    existing.href = myPrsUrl;
    return;
  }

  const parentLi = prTab.closest('li');
  if (!parentLi) return;

  const li = document.createElement('li');
  li.className = parentLi.className;

  const a = document.createElement('a');
  a.href = myPrsUrl;
  a.setAttribute('data-turbo-frame', 'repo-content-turbo-frame');
  a.className = prTab.className.replace(/\s*rgh-seen[^\s]*/g, '').replace(/\s*aria-current="page"/, '');
  a.setAttribute('data-tab-item', 'my-pull-requests');

  a.appendChild(createEelIcon());

  const textSpan = document.createElement('span');
  textSpan.setAttribute('data-component', 'text');
  textSpan.setAttribute('data-content', 'My PRs');
  textSpan.textContent = 'My PRs';
  a.appendChild(textSpan);

  li.appendChild(a);
  parentLi.parentNode.insertBefore(li, parentLi.nextSibling);
}

function initMyPrsTab() {
  void ensureMyPrsTab();
  const observer = new MutationObserver(() => {
    void ensureMyPrsTab();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || changes.myPrsUsername === undefined) return;
  void ensureMyPrsTab();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMyPrsTab);
} else {
  initMyPrsTab();
}
