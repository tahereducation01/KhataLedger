/**
 * ledger.js - Ledger page logic
 * Transaction display & add/remove
 */

const LedgerPage = (() => {

  let currentCustomer = null;
  let currentType = 'gave'; // 'gave' or 'got'
  let currentPhotoBase64 = null;
  let currentTab = 'ledger';

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

    const lateFeeBtn = document.getElementById('btn-late-fee');
    if (lateFeeBtn) {
      if (balance > 0) {
        lateFeeBtn.style.display = 'flex';
      } else {
        lateFeeBtn.style.display = 'none';
      }
    }

    const supplierTabs = document.getElementById('supplier-tabs');
    if (supplierTabs) {
      if (currentCustomer.type === 'supplier') {
        supplierTabs.style.display = 'flex';
      } else {
        supplierTabs.style.display = 'none';
      }
    }
  }

  function switchTab(tab) {
    currentTab = tab;

    document.getElementById('tab-ledger').classList.toggle('active', tab === 'ledger');
    document.getElementById('tab-products').classList.toggle('active', tab === 'products');

    document.getElementById('txn-list').style.display = tab === 'ledger' ? 'block' : 'none';
    document.getElementById('products-list').style.display = tab === 'products' ? 'block' : 'none';

    const actionWrap = document.querySelector('.action-btn-wrap');
    if (actionWrap) {
      actionWrap.style.display = tab === 'ledger' ? 'flex' : 'none';
    }

    if (tab === 'products') {
      renderProducts();
    }
  }

  function renderProducts() {
    const container = document.getElementById('products-list');

    // Check if the supplier has a phone number saved
    if (!currentCustomer.phone) {
      container.innerHTML = `
        <div class="empty-state" style="margin-top: 40px;">
          <div class="empty-icon">📱</div>
          <p class="empty-title">No Phone Number</p>
          <p class="empty-desc">Please edit this supplier and add their WhatsApp number to view their catalog.</p>
        </div>`;
      return;
    }

    // Clean the phone number (remove spaces/dashes) for the WhatsApp link
    const cleanPhone = currentCustomer.phone.replace(/\D/g, '');

    // Generate the universal WhatsApp Catalog link for this specific supplier
    // (If you want to force your specific link for testing, replace this line with: const catalogLink = 'https://wa.me/p/5791402310938976/917767xxxx'; )
    const catalogLink = `https://wa.me/c/${cleanPhone}`;

    // Render a beautiful CTA (Call to Action) card
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); margin-top: 16px; box-shadow: var(--shadow);">
        
        <svg width="64" height="64" viewBox="0 0 24 24" fill="#25D366" style="margin-bottom: 16px;">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>

        <h3 style="margin: 0 0 8px; color: var(--text-primary); font-size: 20px;">Live Store Catalog</h3>
        
        <p style="color: var(--text-muted); font-size: 14px; line-height: 1.5; margin-bottom: 24px; padding: 0 10px;">
          <b>${currentCustomer.name}</b> updates their product inventory directly on WhatsApp. Tap below to view their latest items, check prices, and place orders.
        </p>
        
        <a href="${catalogLink}" target="_blank" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #25D366; color: white; padding: 14px 24px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px; width: 100%; box-sizing: border-box; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);">
          Open WhatsApp Catalog
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
        </a>
        
      </div>
    `;
  }
  function openImage(imgSrc) {
    // Upgrade the dummy image URL to high-res for the lightbox
    const highResImg = imgSrc.replace('w=150', 'w=800');

    document.getElementById('viewer-image').src = highResImg;
    document.getElementById('image-viewer-modal').classList.add('show');
  }
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
    document.getElementById('image-viewer-modal')?.addEventListener('click', function (e) { if (e.target === this) this.classList.remove('show'); });
  }

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

  return { init, switchTab, openImage };
})();