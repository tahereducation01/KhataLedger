/**
 * ledger.js - Ledger page logic
 * Transaction display & add/remove
 */

const LedgerPage = (() => {

  let currentCustomer = null;
  let currentType = 'gave'; // 'gave' or 'got'
  let currentPhotoBase64 = null;

  function init() {
    Auth.requireAuth();
    Settings.applyTheme();
    loadCustomer();
    renderTransactions();
    setupEventListeners();
  }

  function loadCustomer() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) { window.location.href = 'customers.html'; return; }
    currentCustomer = Customers.getById(id);
    if (!currentCustomer) { window.location.href = 'customers.html'; return; }
    renderHeader();
  }

  function renderHeader() {
    const balance = currentCustomer.balance || 0;
    const absBalance = Math.abs(balance);
    const currency = Settings.get().currency;

    document.getElementById('customer-name').textContent = currentCustomer.name;

    const balanceEl = document.getElementById('ledger-balance');
    const balanceLabelEl = document.getElementById('ledger-balance-label');

    balanceEl.textContent = currency + absBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 });

    // FIXED LOGIC: balance > 0 means they owe us (GET), balance < 0 means we owe them (GIVE)
    if (balance > 0) {
      balanceEl.classList.remove('text-red');
      balanceEl.classList.add('text-green');
      balanceLabelEl.textContent = 'You will GET';
    } else if (balance < 0) {
      balanceEl.classList.remove('text-green');
      balanceEl.classList.add('text-red');
      balanceLabelEl.textContent = 'You will GIVE';
    } else {
      balanceEl.classList.remove('text-red', 'text-green');
      balanceLabelEl.textContent = 'Settled';
    }
    
    // FEATURE 3: Hide Late Fee button if balance <= 0
    const lateFeeBtn = document.getElementById('btn-late-fee');
    if (lateFeeBtn) {
      if (balance > 0) {
        lateFeeBtn.style.display = 'flex';
      } else {
        lateFeeBtn.style.display = 'none';
      }
    }
  } // <-- THIS WAS THE MISSING BRACKET!

  function renderTransactions() {
    const container = document.getElementById('txn-list');
    const txns = Transactions.getByCustomer(currentCustomer.id);
    const currency = Settings.get().currency;

    if (txns.length === 0) {
      container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p class="empty-title">No transactions yet</p>
        <p class="empty-desc">Add your first entry using the buttons below</p>
      </div>`;
      return;
    }

    const groups = {};
    txns.forEach(t => {
      const d = t.date;
      if (!groups[d]) groups[d] = [];
      groups[d].push(t);
    });

    let runningBalance = 0;
    let html = '';
    const dates = Object.keys(groups).sort((a, b) => new Date(a) - new Date(b));

    dates.forEach(date => {
      const label = formatDateLabel(date);
      html += `<div class="txn-date-divider">${label}</div>`;
      groups[date].forEach(t => {
        if (t.type === 'gave') runningBalance += t.amount;
        else runningBalance -= t.amount;

        const isGave = t.type === 'gave';
        const amountText = currency + t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 });
        const balText = (runningBalance >= 0 ? 'You get ' : 'You give ') + currency + Math.abs(runningBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 });

        html += `
        <div class="txn-item" data-id="${t.id}">
          <div class="txn-icon ${isGave ? 'txn-icon-gave' : 'txn-icon-got'}">
            ${isGave
            ? `<svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="#EF4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M12 19V5M5 12l7-7 7 7"/></svg>`
            : `<svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12l7 7 7-7"/></svg>`}
          </div>
          <div class="txn-details">
            <p class="txn-note">${t.note || (isGave ? 'You gave' : 'You got')}</p>
            ${t.photo ? `<img src="${t.photo}" style="width:100%; max-width:120px; border-radius:8px; margin-top:6px; border:1px solid var(--border-color); display:block;">` : ''}
            ${t.tag ? `<div style="font-size:10px; background:var(--bg-secondary); padding:2px 8px; border-radius:6px; color:var(--text-secondary); border:1px solid var(--border-color); margin-top:6px; display:inline-block; font-weight:700;">🏷️ ${t.tag}</div>` : ''}
            <p class="txn-time" style="margin-top:4px;">${t.time} · ${isGave ? 'You Gave' : 'You Got'}</p>
          </div>
          <div class="txn-amount-col">
            <span class="txn-amount ${isGave ? 'text-red' : 'text-green'}">${isGave ? '-' : '+'}${amountText}</span>
            <span class="txn-balance">${balText}</span>
          </div>
        </div>`;
      });
    });

    container.innerHTML = html;

    container.querySelectorAll('.txn-item').forEach(el => {
      let pressTimer;
      const startPress = () => pressTimer = setTimeout(() => confirmDelete(el.dataset.id), 700);
      const cancelPress = () => clearTimeout(pressTimer);
      el.addEventListener('touchstart', startPress, { passive: true });
      el.addEventListener('touchend', cancelPress);
      el.addEventListener('touchmove', cancelPress, { passive: true });
      el.addEventListener('touchcancel', cancelPress);
      el.addEventListener('mousedown', startPress);
      el.addEventListener('mouseup', cancelPress);
      el.addEventListener('mouseleave', cancelPress);
    });
  }

  function confirmDelete(txnId) {
    if (confirm('Delete this transaction?')) {
      Transactions.remove(txnId);
      currentCustomer = Customers.getById(currentCustomer.id);
      renderHeader();
      renderTransactions();
      showToast('Transaction deleted', 'success');
    }
  }

  function formatDateLabel(dateStr) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  function openModal(type) {
    currentType = type;
    const modal = document.getElementById('add-txn-modal');
    const title = document.getElementById('modal-title');
    const amountInput = document.getElementById('txn-amount');
    currentPhotoBase64 = null;
    document.getElementById('photo-preview-container').style.display = 'none';
    document.getElementById('photo-input').value = '';

    title.textContent = type === 'gave' ? '💸 You Gave' : '💰 You Got';
    title.style.color = type === 'gave' ? 'var(--red)' : 'var(--green)';
    amountInput.value = '';
    document.getElementById('txn-note').value = '';
    document.getElementById('txn-date').value = new Date().toISOString().split('T')[0];
    modal.classList.add('show');
    setTimeout(() => amountInput.focus(), 200);

    const user = Auth.getCurrentUser();
    const tagInput = document.getElementById('txn-tag');
    const tagLock = document.getElementById('tag-lock-icon');

    if (user.plan === 'advance') {
      tagInput.disabled = false;
      tagLock.textContent = '';
      tagInput.value = '';
    } else {
      tagInput.disabled = true;
      tagInput.value = '';
      tagLock.textContent = '🔒 ADVANCE PLAN ONLY';
    }
  }

  function closeModal() {
    document.getElementById('add-txn-modal').classList.remove('show');
  }

  function saveTransaction() {
    const amount = parseFloat(document.getElementById('txn-amount').value);
    const note = document.getElementById('txn-note').value;
    const date = document.getElementById('txn-date').value;

    if (!amount || amount <= 0 || isNaN(amount)) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    Transactions.add({
      customerId: currentCustomer.id,
      type: currentType,
      amount,
      note,
      date,
      photo: currentPhotoBase64,
      tag: document.getElementById('txn-tag').value
    });

    currentCustomer = Customers.getById(currentCustomer.id);
    closeModal();
    renderHeader();
    renderTransactions();
    showToast(`Entry added: You ${currentType === 'gave' ? 'Gave' : 'Got'} ₹${amount}`, 'success');

    // FEATURE 2: Trigger Auto SMS
    window.triggerAutoSMS(currentCustomer, amount, currentType, note);
  }

  function sendReminder() {
    const balance = currentCustomer.balance || 0;
    if (balance <= 0) { showToast('No pending balance to collect.', 'error'); return; }

    const currency = Settings.get().currency;
    const msg = `Hello ${currentCustomer.name}, you have a pending amount of ${currency}${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}. Please clear the payment at your earliest convenience. Thank you! - ${Auth.getCurrentUser().business}`;
    document.getElementById('reminder-msg-preview').textContent = msg;
    document.getElementById('reminder-modal').classList.add('show');
  }

  function confirmSendReminder() {
    const balance = currentCustomer.balance || 0;
    Reminders.add({
      customerId: currentCustomer.id,
      customerName: currentCustomer.name,
      amount: balance,
      message: document.getElementById('reminder-msg-preview').textContent
    });
    document.getElementById('reminder-modal').classList.remove('show');
    showToast('Reminder sent successfully!', 'success');
  }

  function generatePDFStatement() {
    const user = Auth.getCurrentUser();
    if (!user.plan || user.plan === 'basic') {
      if (confirm('📄 PDF Statements is a Pro feature!\n\nUpgrade to KhataLedger Pro for ₹99/mo to generate professional PDF ledgers.\n\nWould you like to upgrade now?')) {
        window.location.href = 'subscription.html';
      }
      return;
    }

    const txns = Transactions.getByCustomer(currentCustomer.id);
    if (txns.length === 0) { showToast('No transactions to include in statement', 'error'); return; }

    showToast('Generating PDF Statement...', 'default');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const currency = Settings.get().currency;

    doc.setFontSize(22);
    doc.setTextColor(99, 102, 241);
    doc.text(user.business || 'My Business', 14, 20);
    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.text('Account Statement', 14, 30);
    doc.setFontSize(11);
    doc.setTextColor(107, 114, 128);
    doc.text(`Customer Name: ${currentCustomer.name}`, 14, 40);
    if (currentCustomer.phone) doc.text(`Phone Number: ${currentCustomer.phone}`, 14, 46);
    doc.text(`Date Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 52);

    const bal = currentCustomer.balance || 0;
    let balText = 'Settled';
    if (bal > 0) {
      balText = `You will GET: ${currency}${bal.toLocaleString('en-IN')}`;
      doc.setTextColor(16, 185, 129);
    } else if (bal < 0) {
      balText = `You will GIVE: ${currency}${Math.abs(bal).toLocaleString('en-IN')}`;
      doc.setTextColor(239, 68, 68);
    }
    doc.setFontSize(12);
    doc.text(`Net Balance: ${balText}`, 14, 62);

    let runningBalance = 0;
    const tableData = txns.map(t => {
      if (t.type === 'gave') runningBalance += t.amount;
      else runningBalance -= t.amount;

      const gaveAmt = t.type === 'gave' ? `${currency}${t.amount.toLocaleString('en-IN')}` : '-';
      const gotAmt = t.type === 'got' ? `${currency}${t.amount.toLocaleString('en-IN')}` : '-';
      const isPositive = runningBalance >= 0;
      const balStr = `${isPositive ? '' : '-'}${currency}${Math.abs(runningBalance).toLocaleString('en-IN')}`;

      return [t.date, t.note || 'Entry', gaveAmt, gotAmt, balStr];
    });

    doc.autoTable({
      startY: 70,
      head: [['Date', 'Particulars', 'You Gave', 'You Got', 'Balance']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241], textColor: 255 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        2: { halign: 'right', textColor: [239, 68, 68] },
        3: { halign: 'right', textColor: [16, 185, 129] },
        4: { halign: 'right', fontStyle: 'bold' }
      }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text(`Generated securely by KhataLedger - Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
    }

    doc.save(`KhataLedger_${currentCustomer.name.replace(/\s+/g, '_')}_Statement.pdf`);
    showToast('PDF Statement downloaded successfully!', 'success');
  }

  function setupEventListeners() {
    document.getElementById('btn-gave')?.addEventListener('click', () => openModal('gave'));
    document.getElementById('btn-got')?.addEventListener('click', () => openModal('got'));
    document.getElementById('save-txn')?.addEventListener('click', saveTransaction);
    document.getElementById('btn-reminder')?.addEventListener('click', sendReminder);
    document.getElementById('close-reminder')?.addEventListener('click', () => document.getElementById('reminder-modal').classList.remove('show'));
    document.getElementById('confirm-reminder')?.addEventListener('click', confirmSendReminder);
    document.getElementById('btn-pdf')?.addEventListener('click', generatePDFStatement);

    document.getElementById('btn-back')?.addEventListener('click', () => window.location.href = 'customers.html');
    document.getElementById('btn-profile')?.addEventListener('click', () => { window.location.href = 'customer-profile.html?id=' + currentCustomer.id; });

    document.getElementById('add-txn-modal')?.addEventListener('click', function (e) { if (e.target === this) closeModal(); });
    document.getElementById('reminder-modal')?.addEventListener('click', function (e) { if (e.target === this) this.classList.remove('show'); });

    // PHOTO ATTACHMENT
    document.getElementById('photo-btn')?.addEventListener('click', () => {
      const user = Auth.getCurrentUser();
      if (!user.plan || user.plan === 'basic') {
        if (confirm('📸 Photo Attachments is a Pro feature!\n\nUpgrade to KhataLedger Pro to attach bills.\n\nWould you like to upgrade now?')) {
          window.location.href = 'subscription.html';
        }
        return;
      }
      document.getElementById('photo-input').click();
    });

    document.getElementById('photo-input')?.addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (event) {
        const img = new Image();
        img.onload = function () {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 600;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          currentPhotoBase64 = canvas.toDataURL('image/jpeg', 0.6);
          document.getElementById('photo-preview').src = currentPhotoBase64;
          document.getElementById('photo-preview-container').style.display = 'block';
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('remove-photo-btn')?.addEventListener('click', () => {
      currentPhotoBase64 = null;
      document.getElementById('photo-preview-container').style.display = 'none';
      document.getElementById('photo-input').value = '';
    });

    // LATE FEE GUARD UPDATE
    document.getElementById('btn-late-fee')?.addEventListener('click', () => {
      const user = Auth.getCurrentUser();
      if (user.plan !== 'advance') {
        if (confirm('⏳ Auto Late Fees is an Advance feature!\n\nUpgrade to KhataLedger Advance for ₹159/mo to automatically apply interest.\n\nWould you like to upgrade now?')) {
          window.location.href = 'subscription.html';
        }
        return;
      }

      const bal = currentCustomer.balance || 0;
      if (bal <= 0) {
        showToast('Customer has no pending due balance to penalize.', 'error');
        return;
      }

      const feeAmount = parseFloat((bal * 0.02).toFixed(2));
      if (confirm(`Apply a 2% late fee (₹${feeAmount}) to the current due balance of ₹${bal}?`)) {
        Transactions.add({
          customerId: currentCustomer.id,
          type: 'gave',
          amount: feeAmount,
          note: 'Auto Late Fee (2%)',
          date: new Date().toISOString().split('T')[0]
        });

        currentCustomer = Customers.getById(currentCustomer.id);
        renderHeader();
        renderTransactions();
        showToast('2% Late fee applied successfully!', 'success');
      }
    });
  }
  
  // Make SMS trigger global so BOTH customers.html and ledger.js can access it easily
  window.triggerAutoSMS = function (customer, amount, type, note) {
    if (!customer.phone) return; 
    
    const currency = Settings.get().currency;
    const bizName = Auth.getCurrentUser().business || 'us';
    const action = type === 'gave' ? 'Given to you' : 'Received from you';
    
    const msg = `Transaction Alert: ${currency}${amount} has been ${action}.\nNote: ${note || 'N/A'}\nNet Balance: ${currency}${Math.abs(customer.balance || 0)}\n- ${bizName}`;
    
    const encodedMsg = encodeURIComponent(msg);
    const separator = /ipad|iphone|ipod/.test(navigator.userAgent.toLowerCase()) ? '&' : '?';
    window.open(`sms:${customer.phone}${separator}body=${encodedMsg}`, '_blank');
  };

  return { init };
})();