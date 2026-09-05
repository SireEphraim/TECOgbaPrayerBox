(() => {
  const STATUS_TABS = [
    { key: 'all', label: 'All' },
    { key: 'new', label: 'New' },
    { key: 'praying', label: 'Praying' },
    { key: 'answered', label: 'Answered' }
  ];
  const $ = (id) => document.getElementById(id);
  let prayers = [];
  let statusFilter = 'all';

  function setMessage(id, text, kind = 'muted') {
    const element = $(id);
    element.textContent = text;
    element.className = `message ${kind}`;
  }

  function timeAgo(value) {
    const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return days < 7 ? `${days}d ago` : new Date(value).toLocaleDateString();
  }

  function showLogin(message = '') {
    $('dashboard-view').classList.add('hidden');
    $('login-view').classList.remove('hidden');
    if (message) setMessage('login-message', message, 'error');
  }

  function showDashboard() {
    $('login-view').classList.add('hidden');
    $('dashboard-view').classList.remove('hidden');
  }

  function renderTabs() {
    const container = $('status-tabs');
    container.innerHTML = '';
    STATUS_TABS.forEach((tab) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `pill${statusFilter === tab.key ? ' selected' : ''}`;
      button.textContent = tab.label;
      button.setAttribute('aria-pressed', String(statusFilter === tab.key));
      button.addEventListener('click', () => {
        statusFilter = tab.key;
        renderTabs();
        renderRequests();
      });
      container.appendChild(button);
    });
  }

  function statusLabel(status) {
    return status === 'new' ? 'New' : status === 'praying' ? 'Praying' : 'Answered';
  }

  function renderRequests() {
    const list = $('prayer-list');
    const visible = statusFilter === 'all' ? prayers : prayers.filter((prayer) => prayer.status === statusFilter);
    list.innerHTML = '';
    if (visible.length === 0) {
      setMessage('dashboard-message', prayers.length ? 'No requests match this filter.' : 'No prayer requests yet.', 'muted');
      return;
    }
    setMessage('dashboard-message', `${visible.length} request${visible.length === 1 ? '' : 's'} shown.`, 'muted');

    visible.forEach((prayer) => {
      const item = document.createElement('li');
      item.className = 'prayer-item';

      const meta = document.createElement('div');
      meta.className = 'prayer-item-meta';
      const category = document.createElement('span');
      category.className = 'tag tag-category';
      category.textContent = prayer.category || 'Uncategorized';
      meta.appendChild(category);
      if (prayer.urgent) {
        const urgent = document.createElement('span');
        urgent.className = 'tag tag-urgent';
        urgent.textContent = 'Urgent';
        meta.appendChild(urgent);
      }
      const time = document.createElement('span');
      time.className = 'tag-time';
      time.textContent = timeAgo(prayer.created_at);
      meta.appendChild(time);
      item.appendChild(meta);

      const text = document.createElement('p');
      text.className = 'prayer-item-text';
      text.textContent = prayer.request_text;
      item.appendChild(text);

      const actions = document.createElement('div');
      actions.className = 'prayer-item-actions';
      STATUS_TABS.filter((tab) => tab.key !== 'all').forEach((tab) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `pill pill-sm${prayer.status === tab.key ? ' selected' : ''}`;
        button.textContent = statusLabel(tab.key);
        button.addEventListener('click', () => updateStatus(prayer.id, tab.key));
        actions.appendChild(button);
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'link-btn link-btn-danger';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        if (window.confirm('Remove this prayer request? This cannot be undone.')) removeRequest(prayer.id);
      });
      actions.appendChild(remove);
      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  async function loadRequests() {
    setMessage('dashboard-message', 'Loading prayer requests…', 'muted');
    const { data, error } = await window.PrayerBox.client
      .from('prayer_requests')
      .select('id, request_text, category, urgent, status, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      prayers = [];
      $('prayer-list').innerHTML = '';
      setMessage(
        'dashboard-message',
        'This account is not approved by the Prayer Ministry.',
        'error'
      );
      return;
    }
    prayers = data;
    renderRequests();
  }

  async function updateStatus(id, status) {
    const { error } = await window.PrayerBox.client
      .from('prayer_requests')
      .update({ status })
      .eq('id', id);
    if (error) {
      setMessage('dashboard-message', 'The status could not be saved. Please refresh and try again.', 'error');
      return;
    }
    prayers = prayers.map((prayer) => prayer.id === id ? { ...prayer, status } : prayer);
    renderRequests();
  }

  async function removeRequest(id) {
    const { error } = await window.PrayerBox.client
      .from('prayer_requests')
      .delete()
      .eq('id', id);
    if (error) {
      setMessage('dashboard-message', 'The request could not be removed. Please refresh and try again.', 'error');
      return;
    }
    prayers = prayers.filter((prayer) => prayer.id !== id);
    renderRequests();
  }

  async function restoreSession() {
    if (!window.PrayerBox.configured) {
      showLogin(window.PrayerBox.configurationMessage);
      return;
    }
    const { data: { session } } = await window.PrayerBox.client.auth.getSession();
    if (session) {
      showDashboard();
      loadRequests();
    } else {
      showLogin();
    }
  }

  $('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!window.PrayerBox.configured) {
      setMessage('login-message', window.PrayerBox.configurationMessage, 'error');
      return;
    }
    const button = $('login-button');
    button.disabled = true;
    button.textContent = 'Signing in…';
    const { error } = await window.PrayerBox.client.auth.signInWithPassword({
      email: $('email').value.trim(),
      password: $('password').value
    });
    button.disabled = false;
    button.textContent = 'Sign in';
    if (error) {
      setMessage('login-message', 'We could not sign you in. Check your email and password.', 'error');
      return;
    }
    $('login-message').className = 'message hidden';
    showDashboard();
    loadRequests();
  });

  $('logout-button').addEventListener('click', async () => {
    await window.PrayerBox.client.auth.signOut();
    prayers = [];
    $('email').value = '';
    $('password').value = '';
    showLogin();
  });
  $('refresh-button').addEventListener('click', loadRequests);

  window.PrayerBox.client?.auth.onAuthStateChange((_event, session) => {
    if (!session) showLogin();
  });
  renderTabs();
  restoreSession();
})();
