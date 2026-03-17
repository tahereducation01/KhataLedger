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
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.checked = s.theme === 'dark';

    // Business name
    const businessInput = document.getElementById('business-name-input');
    if (businessInput) businessInput.value = user?.business || s.businessName || '';

    // Currency
    const currencySelect = document.getElementById('currency-select');
    if (currencySelect) currencySelect.value = s.currency || '₹';

    // Show user info & Subscription Plan Status
    if (user) {
      document.getElementById('user-name').textContent = user.name;
      document.getElementById('user-email').textContent = user.email;
      document.getElementById('user-avatar').textContent = user.name.charAt(0).toUpperCase();

      const currentPlan = user.plan || 'basic';
      const badge = document.getElementById('user-plan-badge');
      const upgradeText = document.getElementById('upgrade-text');

      if (badge && upgradeText) {
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
    
    checkStaffAccess(user);
  }

  function checkStaffAccess(user) {
    const staffSection = document.getElementById('staff-management-section');
    const btnAddStaff = document.getElementById('btn-add-staff');
    const btnClearData = document.getElementById('btn-clear-data');
    const upgradeText = document.getElementById('upgrade-text');

    // If the logged-in user is a staff member, restrict access
    if (user && user.role === 'staff') {
      if (btnClearData) btnClearData.style.display = 'none';
      if (upgradeText && upgradeText.parentElement) upgradeText.parentElement.style.display = 'none'; // Hide subscription row
      if (staffSection) staffSection.style.display = 'none'; // Hide staff management
      return; // Stop execution here for staff
    }

    // If owner, render the list of staff
    renderStaffList();

    // Setup Paywall for adding staff
    if (btnAddStaff) {
      btnAddStaff.addEventListener('click', () => {
        if (user.plan !== 'advance') {
          if (confirm('👥 Multi-Staff Logins is an Advance feature!\n\nUpgrade to KhataLedger Advance for ₹159/mo to allow your team to manage entries.\n\nWould you like to upgrade now?')) {
            window.location.href = 'subscription.html';
          }
          return;
        }
        document.getElementById('staff-name').value = '';
        document.getElementById('staff-email').value = '';
        document.getElementById('staff-password').value = '';
        document.getElementById('add-staff-modal').classList.add('show');
      });
    }
  }

  function renderStaffList() {
    const container = document.getElementById('staff-list-container');
    if (!container) return;

    const staff = Auth.getStaff();

    if (staff.length === 0) {
      container.innerHTML = `<div style="padding:16px; text-align:center; color:var(--text-muted); font-size:13px;">No staff members added yet.</div>`;
      return;
    }

    container.innerHTML = staff.map(s => `
      <div class="settings-row" style="cursor:default;">
        <div class="settings-icon" style="background:var(--bg-secondary); color:var(--text-primary); font-weight:700;">
          ${s.name.charAt(0).toUpperCase()}
        </div>
        <div style="flex:1;">
          <div class="settings-label">${s.name}</div>
          <div class="settings-value">${s.email}</div>
        </div>
        <button onclick="SettingsPage.deleteStaff('${s.id}')" style="background:none; border:none; color:var(--red); padding:8px; cursor:pointer;" title="Remove Staff">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    `).join('');
  }

  // Make this publicly accessible to the inline onclick handler
  function deleteStaff(id) {
    if (confirm('Remove this staff member? They will no longer be able to log in.')) {
      Auth.removeStaff(id);
      renderStaffList();
      showToast('Staff removed', 'success');
    }
  }

  function setupEventListeners() {
    // Theme toggle
    document.getElementById('theme-toggle')?.addEventListener('change', function () {
      const theme = this.checked ? 'dark' : 'light';
      Settings.set({ theme });
      Settings.applyTheme();
    });

    // Business name save
    document.getElementById('save-business')?.addEventListener('click', () => {
      const name = document.getElementById('business-name-input').value.trim();
      if (!name) { showToast('Please enter a business name', 'error'); return; }
      Settings.set({ businessName: name });
      Auth.updateBusiness(name);
      showToast('Business name updated!', 'success');
    });

    // Currency
    document.getElementById('currency-select')?.addEventListener('change', function () {
      Settings.set({ currency: this.value });
      showToast('Currency updated!', 'success');
    });

    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to logout?')) {
        Auth.logout();
      }
    });

    // Back
    document.getElementById('btn-back')?.addEventListener('click', () => history.back());

    // Clear data (dangerous)
    document.getElementById('btn-clear-data')?.addEventListener('click', () => {
      if (confirm('⚠️ This will delete ALL your data including customers and transactions. Are you sure?')) {
        const keysToDelete = ['ledger_customers', 'ledger_transactions', 'ledger_reminders'];
        keysToDelete.forEach(k => localStorage.removeItem(k));
        showToast('All data cleared', 'success');
        
        // Optional: refresh page to show empty state
        setTimeout(() => window.location.reload(), 1000);
      }
    });

    // Save New Staff Member
    document.getElementById('save-staff-btn')?.addEventListener('click', () => {
      const name = document.getElementById('staff-name').value;
      const email = document.getElementById('staff-email').value;
      const pass = document.getElementById('staff-password').value;

      if (!name || !email || pass.length < 6) {
        showToast('Please fill all fields (Min password: 6 chars)', 'error');
        return;
      }

      const res = Auth.addStaff(name, email, pass);
      if (res.success) {
        document.getElementById('add-staff-modal').classList.remove('show');
        renderStaffList();
        showToast(`Staff account for ${name} created!`, 'success');
      } else {
        showToast(res.message, 'error');
      }
    });

    // Close Modals on overlay click
    document.getElementById('add-staff-modal')?.addEventListener('click', function (e) {
      if (e.target === this) this.classList.remove('show');
    });
  }

  // Export functions to be accessible globally via SettingsPage.functionName
  return { init, deleteStaff };

})();