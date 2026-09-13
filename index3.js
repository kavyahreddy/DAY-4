const STORAGE_KEY = 'sritw-notice-board-notices';
const SESSION_KEY = 'sritw-notice-board-admin';
const ADMIN_USERNAME = 'superadmin';
const ADMIN_PASSWORD = 'sritw@2026';

const demoNotices = [
  { id: 'notice-1', title: 'End-semester examination timetable', category: 'Exams', date: '2026-09-10', expiry: '2026-09-25', priority: 'Urgent', summary: 'Students should review the published timetable and contact the examination cell for corrections.', attachment: 'https://www.sritw.org/' },
  { id: 'notice-2', title: 'Placement readiness workshop registrations', category: 'Placements', date: '2026-09-09', expiry: '2026-09-22', priority: 'Important', summary: 'Registration is open for the next aptitude, coding and interview preparation session.', attachment: 'https://www.sritw.org/Placements' },
  { id: 'notice-3', title: 'Hostel room application reminder', category: 'Hostel', date: '2026-09-07', expiry: '2026-09-20', priority: 'Important', summary: 'Eligible students can submit hostel applications through the admissions office.', attachment: 'https://www.sritw.org/hostel' },
  { id: 'notice-4', title: 'Academic calendar and class commencement', category: 'Academics', date: '2026-09-04', expiry: '2026-10-01', priority: 'Normal', summary: 'Please check your department communication for semester commencement information.', attachment: '' },
  { id: 'notice-5', title: 'Student club registration week', category: 'Events', date: '2026-09-02', expiry: '2026-09-30', priority: 'Normal', summary: 'Students can express interest in technical, cultural and community activities.', attachment: 'https://www.sritw.org/clubs' },
  { id: 'notice-6', title: 'Transport route information', category: 'Transport', date: '2026-08-28', expiry: '2026-09-18', priority: 'Normal', summary: 'Day scholars should confirm route and stop details with the transport office.', attachment: 'https://www.sritw.org/transportation' }
];

const state = { notices: [], isAdmin: false, editingId: null };
const $ = (selector) => document.querySelector(selector);

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function safeAttachment(value = '') {
  return /^https:\/\//i.test(value) || /^http:\/\//i.test(value) ? value : '';
}

function loadNotices() {
  const saved = localStorage.getItem(STORAGE_KEY);
  state.notices = saved ? JSON.parse(saved) : demoNotices;
  if (!saved) saveNotices();
}

function saveNotices() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.notices));
}

function isExpired(notice) {
  return notice.expiry < todayString();
}

function priorityRank(priority) {
  return { Urgent: 0, Important: 1, Normal: 2 }[priority] ?? 3;
}

function activeNotices() {
  return state.notices.filter((notice) => !isExpired(notice));
}

function sortedNotices(notices) {
  return [...notices].sort((first, second) => priorityRank(first.priority) - priorityRank(second.priority) || second.date.localeCompare(first.date));
}

function renderFeatured(notices) {
  const featured = sortedNotices(notices).filter((notice) => notice.priority !== 'Normal').slice(0, 3);
  $('#featured-notices').innerHTML = featured.length ? featured.map((notice) => {
    const attachment = safeAttachment(notice.attachment);
    return `<article class="featured-card ${notice.priority.toLowerCase()}"><div class="notice-meta"><span class="pill ${notice.priority.toLowerCase()}">${escapeHtml(notice.priority)}</span><span>${escapeHtml(notice.category)}</span></div><h3>${escapeHtml(notice.title)}</h3><p>${escapeHtml(notice.summary)}</p>${attachment ? `<a href="${escapeHtml(attachment)}" target="_blank" rel="noopener">Open attachment ↗</a>` : ''}</article>`;
  }).join('') : '<div class="empty-state">No urgent or important notices are active right now.</div>';
}

function renderNoticeList() {
  const search = $('#search-input').value.trim().toLowerCase();
  const category = $('#category-filter').value;
  const priority = $('#priority-filter').value;
  const filtered = sortedNotices(activeNotices()).filter((notice) => {
    const searchable = `${notice.title} ${notice.summary} ${notice.category} ${notice.date}`.toLowerCase();
    return (!search || searchable.includes(search)) && (category === 'All' || notice.category === category) && (priority === 'All' || notice.priority === priority);
  });
  $('#notice-count').textContent = filtered.length;
  $('#notice-list').innerHTML = filtered.length ? filtered.map((notice) => {
    const daysLeft = Math.ceil((new Date(`${notice.expiry}T00:00:00`) - new Date(`${todayString()}T00:00:00`)) / 86400000);
    const attachment = safeAttachment(notice.attachment);
    return `<article class="notice-card ${daysLeft <= 3 ? 'expiring' : ''}"><div class="notice-date"><strong>${formatDate(notice.date).slice(0, 2)}</strong>${formatDate(notice.date).slice(3)}</div><div><div class="notice-meta"><span class="pill ${notice.priority.toLowerCase()}">${escapeHtml(notice.priority)}</span><span>${escapeHtml(notice.category)}</span></div><h3>${escapeHtml(notice.title)}</h3><p>${escapeHtml(notice.summary)}</p></div>${attachment ? `<a class="attachment" href="${escapeHtml(attachment)}" target="_blank" rel="noopener">Attachment ↗</a>` : '<span class="attachment">No attachment</span>'}</article>`;
  }).join('') : '<div class="empty-state">No active notices match your search or filters.</div>';
}

function renderAdminList() {
  if (!state.isAdmin) return;
  const notices = [...state.notices].sort((first, second) => second.date.localeCompare(first.date));
  $('#admin-count').textContent = `${notices.length} notice${notices.length === 1 ? '' : 's'}`;
  $('#admin-notice-list').innerHTML = notices.length ? notices.map((notice) => `<article class="admin-item"><div><h4>${escapeHtml(notice.title)}</h4><p>${escapeHtml(notice.category)} · ${formatDate(notice.date)} · ${isExpired(notice) ? 'Expired' : notice.priority}</p></div><div class="admin-buttons"><button class="edit" type="button" data-edit-id="${escapeHtml(notice.id)}">Edit</button><button class="delete" type="button" data-delete-id="${escapeHtml(notice.id)}">Delete</button></div></article>`).join('') : '<div class="empty-state">No notices yet.</div>';
}

function renderBoard() {
  const notices = activeNotices();
  renderFeatured(notices);
  renderNoticeList();
  renderAdminList();
}

function openLogin() {
  $('#login-modal').classList.add('open');
  $('#login-modal').setAttribute('aria-hidden', 'false');
  $('#admin-username').focus();
}

function closeLogin() {
  $('#login-modal').classList.remove('open');
  $('#login-modal').setAttribute('aria-hidden', 'true');
  $('#login-message').textContent = '';
}

function openAdmin() {
  state.isAdmin = true;
  localStorage.setItem(SESSION_KEY, 'true');
  $('#admin-drawer').classList.add('open');
  $('#admin-drawer').setAttribute('aria-hidden', 'false');
  renderAdminList();
  $('#admin-drawer').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function logout() {
  state.isAdmin = false;
  localStorage.removeItem(SESSION_KEY);
  $('#admin-drawer').classList.remove('open');
  $('#admin-drawer').setAttribute('aria-hidden', 'true');
  resetForm();
}

function resetForm() {
  state.editingId = null;
  $('#notice-form').reset();
  $('#notice-date').value = todayString();
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);
  $('#notice-expiry').value = expiry.toISOString().slice(0, 10);
  $('#form-title').textContent = 'Publish a notice';
  $('#save-notice').innerHTML = 'Publish notice <span>→</span>';
  $('#form-message').textContent = '';
}

function editNotice(id) {
  const notice = state.notices.find((item) => item.id === id);
  if (!notice || !state.isAdmin) return;
  state.editingId = id;
  $('#notice-id').value = id;
  $('#notice-title').value = notice.title;
  $('#notice-category').value = notice.category;
  $('#notice-priority').value = notice.priority;
  $('#notice-date').value = notice.date;
  $('#notice-expiry').value = notice.expiry;
  $('#notice-attachment').value = notice.attachment;
  $('#notice-summary').value = notice.summary;
  $('#form-title').textContent = 'Edit notice';
  $('#save-notice').innerHTML = 'Save changes <span>→</span>';
  $('#admin-drawer').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function deleteNotice(id) {
  if (!state.isAdmin) return;
  const notice = state.notices.find((item) => item.id === id);
  if (!notice || !window.confirm(`Delete “${notice.title}”?`)) return;
  state.notices = state.notices.filter((item) => item.id !== id);
  saveNotices();
  renderBoard();
}

function handleNoticeSubmit(event) {
  event.preventDefault();
  if (!state.isAdmin) return;
  const notice = { id: state.editingId || `notice-${Date.now()}`, title: $('#notice-title').value.trim(), category: $('#notice-category').value, priority: $('#notice-priority').value, date: $('#notice-date').value, expiry: $('#notice-expiry').value, attachment: $('#notice-attachment').value.trim(), summary: $('#notice-summary').value.trim() };
  if (notice.expiry < notice.date) {
    $('#form-message').textContent = 'Expiry date must be on or after the publish date.';
    return;
  }
  const existingIndex = state.notices.findIndex((item) => item.id === notice.id);
  if (existingIndex >= 0) state.notices[existingIndex] = notice;
  else state.notices.push(notice);
  saveNotices();
  renderBoard();
  resetForm();
  $('#form-message').textContent = existingIndex >= 0 ? 'Notice updated.' : 'Notice published.';
}

function initialise() {
  loadNotices();
  $('#today-date').textContent = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  $('#search-input').addEventListener('input', renderNoticeList);
  $('#category-filter').addEventListener('change', renderNoticeList);
  $('#priority-filter').addEventListener('change', renderNoticeList);
  $('#clear-filters').addEventListener('click', () => { $('#search-input').value = ''; $('#category-filter').value = 'All'; $('#priority-filter').value = 'All'; renderNoticeList(); });
  $('#open-login').addEventListener('click', openLogin);
  document.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', closeLogin));
  $('#login-form').addEventListener('submit', (event) => { event.preventDefault(); if ($('#admin-username').value.trim() === ADMIN_USERNAME && $('#admin-password').value === ADMIN_PASSWORD) { closeLogin(); openAdmin(); } else $('#login-message').textContent = 'Access denied. Only the Super Admin account can continue.'; });
  $('#logout-button').addEventListener('click', logout);
  $('#notice-form').addEventListener('submit', handleNoticeSubmit);
  $('#cancel-edit').addEventListener('click', resetForm);
  $('#admin-notice-list').addEventListener('click', (event) => { const editButton = event.target.closest('[data-edit-id]'); const deleteButton = event.target.closest('[data-delete-id]'); if (editButton) editNotice(editButton.dataset.editId); if (deleteButton) deleteNotice(deleteButton.dataset.deleteId); });
  if (localStorage.getItem(SESSION_KEY) === 'true') openAdmin();
  resetForm();
  renderBoard();
}

document.addEventListener('DOMContentLoaded', initialise);
