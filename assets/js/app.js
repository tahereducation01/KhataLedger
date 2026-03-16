/**
 * app.js - Global utilities shared across all pages
 */

// ============================================================
// Toast notifications
// ============================================================
function showToast(message, type = 'default', duration = 3000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast ' + type;

  const icons = { success: '✅', error: '❌', default: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || icons.default}</span> ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-8px)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================================
// Avatar color helper
// ============================================================
function getAvatarClass(n) {
  return 'avatar-' + ((n % 8) + 1);
}

// ============================================================
// Format currency
// ============================================================
function formatCurrency(amount, currency) {
  currency = currency || Settings.get().currency;
  return currency + Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

// ============================================================
// Format relative time
// ============================================================
function timeAgo(dateStr, timeStr) {
  const dt = new Date(dateStr + 'T' + (timeStr || '00:00'));
  const now = new Date();
  const diff = now - dt;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  if (hrs < 24) return hrs + 'h ago';
  if (days === 1) return 'Yesterday';
  if (days < 7) return days + 'd ago';
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ============================================================
// Apply theme on every page load
// ============================================================
(function() {
  const s = JSON.parse(localStorage.getItem('ledger_settings') || '{}');
  if (s.theme) document.documentElement.setAttribute('data-theme', s.theme);
})();
