/**
 * settings.js - Settings page logic
 */

const SettingsPage = (() => {

  function init() {
    Auth.requireAuth();
    Settings.applyTheme();
    loadSettings();
    setupEventListeners();
  }

  function loadSettings() {
    const s = Settings.get();
    const user = Auth.getCurrentUser();

    // Theme toggle
    document.getElementById('theme-toggle').checked = s.theme === 'dark';

    // Business name
    document.getElementById('business-name-input').value = user?.business || s.businessName || '';

    // Currency
    document.getElementById('currency-select').value = s.currency || '₹';

    // Show user info & Subscription Plan Status
    if (user) {
      document.getElementById('user-name').textContent = user.name;
      document.getElementById('user-email').textContent = user.email;
      document.getElementById('user-avatar').textContent = user.name.charAt(0).toUpperCase();

      const currentPlan = user.plan || 'basic';
      const badge = document.getElementById('user-plan-badge');
      const upgradeText = document.getElementById('upgrade-text');

      badge.textContent = currentPlan;

      // Style the badge based on plan
      if (currentPlan === 'pro') {
        badge.style.background = 'var(--accent-light)';
        badge.style.color = 'var(--accent)';
        upgradeText.textContent = 'Manage Subscription';
        upgradeText.style.fontWeight = '600';
      } else if (currentPlan === 'advance') {
        badge.style.background = 'var(--text-primary)';
        badge.style.color = 'var(--bg-card)';
        upgradeText.textContent = 'Manage Subscription';
        upgradeText.style.fontWeight = '600';
      } else {
        // Basic plan logic
        badge.style.background = 'var(--border-color)';
        badge.style.color = 'var(--text-secondary)';
        upgradeText.textContent = 'Upgrade to Pro ✨';
      }
    }
  }

  function setupEventListeners() {
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('change', function () {
      const theme = this.checked ? 'dark' : 'light';
      Settings.set({ theme });
      Settings.applyTheme();
    });

    // Business name save
    document.getElementById('save-business').addEventListener('click', () => {
      const name = document.getElementById('business-name-input').value.trim();
      if (!name) { showToast('Please enter a business name', 'error'); return; }
      Settings.set({ businessName: name });
      Auth.updateBusiness(name);
      showToast('Business name updated!', 'success');
    });

    // Currency
    document.getElementById('currency-select').addEventListener('change', function () {
      Settings.set({ currency: this.value });
      showToast('Currency updated!', 'success');
    });

    // Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
      if (confirm('Are you sure you want to logout?')) {
        Auth.logout();
      }
    });

    // Back
    document.getElementById('btn-back').addEventListener('click', () => history.back());

    // Clear data (dangerous)
    document.getElementById('btn-clear-data')?.addEventListener('click', () => {
      if (confirm('⚠️ This will delete ALL your data including customers and transactions. Are you sure?')) {
        const keysToDelete = ['ledger_customers', 'ledger_transactions', 'ledger_reminders'];
        keysToDelete.forEach(k => localStorage.removeItem(k));
        showToast('All data cleared', 'success');
      }
    });
  }

  return { init };
})();
