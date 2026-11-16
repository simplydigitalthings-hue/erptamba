(function () {
  'use strict';

  const STORAGE_KEY = 'tambahq_recent_workspaces';
  const hostname = (window.location.hostname || '').toLowerCase();
  const isBeta = hostname.startsWith('beta.') || hostname.includes('beta');
  let BASE_DOMAIN = isBeta ? 'beta.tambahq.in' : 'tambahq.in';
  let appVersion = isBeta ? 'v2.0-beta' : '';

  const form = document.getElementById('workspace-form');
  const input = document.getElementById('workspace-input');
  const previewUrl = document.getElementById('preview-url');
  const errorMsg = document.getElementById('error-message');
  const submitBtn = document.getElementById('submit-btn');
  const recentSection = document.getElementById('recent-workspaces-section');
  const recentList = document.getElementById('recent-list');
  const clearRecentBtn = document.getElementById('clear-recent');

  // Display subtle version tag in corner if on beta
  function setupEnvBadge() {
    if (!isBeta && !appVersion) return;
    let badge = document.getElementById('corner-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'corner-badge';
      badge.className = 'corner-badge';
      badge.setAttribute('aria-label', 'Environment version');
      document.body.appendChild(badge);
    }
    badge.textContent = appVersion || 'v2.0-beta';
    badge.style.display = 'block';
  }

  // Probe server config for environment details
  fetch('/check.php?action=info', { cache: 'no-store' })
    .then(r => r.json())
    .then(info => {
      if (info && info.base_domain) {
        BASE_DOMAIN = info.base_domain;
      }
      if (info && info.env === 'beta') {
        appVersion = info.version || 'v2.0-beta';
        setupEnvBadge();
      }
      updatePreview();
    })
    .catch(() => {
      // Offline or direct static preview fallback
      if (isBeta) setupEnvBadge();
    });

  function cleanSlug(value) {
    return (value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/^-+|-+$/g, '');
  }

  function updatePreview() {
    const raw = input.value.trim().toLowerCase();
    const clean = raw.replace(/[^a-z0-9-]/g, '');
    if (!clean) {
      previewUrl.textContent = 'https://{workspace}.' + BASE_DOMAIN;
    } else {
      previewUrl.textContent = 'https://' + clean + '.' + BASE_DOMAIN;
    }
  }

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
  }

  function hideError() {
    errorMsg.textContent = '';
    errorMsg.style.display = 'none';
  }

  function getRecents() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveRecent(slug) {
    try {
      let recents = getRecents();
      recents = recents.filter(item => item !== slug);
      recents.unshift(slug);
      if (recents.length > 5) recents = recents.slice(0, 5);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recents));
      renderRecents();
    } catch (e) {
      // Ignore storage errors
    }
  }

  function renderRecents() {
    const recents = getRecents();
    if (!recents.length) {
      recentSection.style.display = 'none';
      return;
    }
    recentList.innerHTML = '';
    recents.forEach(slug => {
      const a = document.createElement('a');
      a.className = 'recent-item';
      a.href = '#';
      a.textContent = slug + '.' + BASE_DOMAIN;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        input.value = slug;
        updatePreview();
        launchWorkspace(slug);
      });
      recentList.appendChild(a);
    });
    recentSection.style.display = 'block';
  }

  function clearRecents() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      renderRecents();
    } catch (e) {
      // Ignore
    }
  }

  async function launchWorkspace(slug) {
    hideError();
    const clean = cleanSlug(slug);
    if (!clean) {
      showError('Please enter a valid factory workspace identifier.');
      input.focus();
      return;
    }
    if (clean.length < 2) {
      showError('Workspace name must be at least 2 characters long.');
      input.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Verifying workspace...</span> <span class="btn-arrow">⏳</span>';

    try {
      const checkUrl = '/check.php?slug=' + encodeURIComponent(clean) + '&_t=' + Date.now();
      const res = await fetch(checkUrl, { cache: 'no-store' });
      const data = await res.json();

      if (data && data.exists === true) {
        saveRecent(clean);
        submitBtn.innerHTML = '<span>Connecting to workspace...</span> <span class="btn-arrow">✓</span>';
        const targetUrl = data.url || ('https://' + clean + '.' + BASE_DOMAIN);
        window.location.href = targetUrl;
        return;
      }

      // Workspace not found! Navigate immediately to the custom sorry page
      window.location.href = '/sorry.html?w=' + encodeURIComponent(clean);
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Continue to Workspace</span> <span class="btn-arrow">→</span>';
      showError('Unable to verify workspace right now. Please check your internet connection.');
    }
  }

  // Pre-fill from query params if ?w= or ?workspace= is provided
  try {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get('w') || params.get('workspace');
    if (initial) {
      input.value = cleanSlug(initial);
      updatePreview();
    }
  } catch (e) {
    // Ignore
  }

  input.addEventListener('input', function () {
    hideError();
    updatePreview();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    launchWorkspace(input.value);
  });

  if (clearRecentBtn) {
    clearRecentBtn.addEventListener('click', clearRecents);
  }

  renderRecents();
})();
