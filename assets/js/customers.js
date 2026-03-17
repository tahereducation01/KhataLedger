/**
 * customers.js - Customer & Supplier management
 * CRUD operations stored in localStorage
 */

const Customers = (() => {

  const KEY = 'ledger_customers';

  function getAll() {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  }

  function save(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function getById(id) {
    return getAll().find(c => c.id === id) || null;
  }

  function add(data) {
    const list = getAll();
    const newContact = {
      id: 'cust_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name: data.name.trim(),
      phone: data.phone ? data.phone.trim() : '',
      address: data.address ? data.address.trim() : '',
      type: data.type || 'customer', // 'customer' or 'supplier'
      avatarColor: data.avatarColor || Math.floor(Math.random() * 8) + 1,
      createdAt: new Date().toISOString(),
      balance: 0
    };
    list.push(newContact);
    save(list);
    return newContact;
  }

  function update(id, data) {
    const list = getAll();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...data };
    save(list);
    return true;
  }

  function remove(id) {
    const list = getAll().filter(c => c.id !== id);
    save(list);
    // Also remove all transactions for this customer
    Transactions.removeByCustomer(id);
    Reminders.removeByCustomer(id);
  }

  function getByType(type) {
    return getAll().filter(c => c.type === type);
  }

  // Update balance based on transactions
  function recalcBalance(id) {
    const txns = Transactions.getByCustomer(id);
    let balance = 0;
    txns.forEach(t => {
      // FIXED LOGIC: 'gave' increases what they owe us (+), 'got' decreases it (-)
      if (t.type === 'gave') balance += t.amount;
      else balance -= t.amount;
    });
    update(id, { balance });
    return balance;
  }

  function search(query, type) {
    const q = query.trim().toLowerCase();
    const list = type ? getByType(type) : getAll();
    if (!q) return list;
    return list.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q))
    );
  }

  return { getAll, getById, add, update, remove, getByType, recalcBalance, search };
})();


/**
 * Transactions module
 */
const Transactions = (() => {

  const KEY = 'ledger_transactions';

  function getAll() {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  }

  function save(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function getByCustomer(customerId) {
    return getAll()
      .filter(t => t.customerId === customerId)
      .sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
  }

  // Inside customers.js -> Transactions module
  function add(data) {
    const list = getAll();
    const txn = {
      id: 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      customerId: data.customerId,
      type: data.type, // 'gave' or 'got'
      amount: parseFloat(data.amount),
      note: data.note ? data.note.trim() : '',
      tag: data.tag ? data.tag.trim() : '', // <-- NEW: Advance Tier Tag
      photo: data.photo || null,            // <-- NEW: Pro Tier Photo
      date: data.date || new Date().toISOString().split('T')[0],
      time: data.time || new Date().toTimeString().slice(0, 5),
      createdAt: new Date().toISOString()
    };
    list.push(txn);
    save(list);
    Customers.recalcBalance(data.customerId);
    return txn;
  }

  function remove(id) {
    const list = getAll();
    const txn = list.find(t => t.id === id);
    const filtered = list.filter(t => t.id !== id);
    save(filtered);
    if (txn) Customers.recalcBalance(txn.customerId);
  }

  function removeByCustomer(customerId) {
    const list = getAll().filter(t => t.customerId !== customerId);
    save(list);
  }

  // Get all transactions sorted by date desc (for reports)
  function getRecent(limit = 20) {
    return getAll()
      .sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time))
      .slice(0, limit);
  }

  // Monthly summary for reports
  function getMonthlySummary() {
    const all = getAll();
    const monthly = {};
    all.forEach(t => {
      const month = t.date.slice(0, 7); // YYYY-MM
      if (!monthly[month]) monthly[month] = { gave: 0, got: 0 };
      if (t.type === 'gave') monthly[month].gave += t.amount;
      else monthly[month].got += t.amount;
    });
    return monthly;
  }

  return { getAll, getByCustomer, add, remove, removeByCustomer, getRecent, getMonthlySummary };
})();


/**
 * Reminders module
 */
const Reminders = (() => {

  const KEY = 'ledger_reminders';

  function getAll() {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  }

  function save(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function add(data) {
    const list = getAll();
    const reminder = {
      id: 'rem_' + Date.now(),
      customerId: data.customerId,
      customerName: data.customerName,
      amount: data.amount,
      message: data.message,
      sentAt: new Date().toISOString(),
      status: 'sent'
    };
    list.push(reminder);
    save(list);
    return reminder;
  }

  function removeByCustomer(customerId) {
    const list = getAll().filter(r => r.customerId !== customerId);
    save(list);
  }

  function getByCustomer(customerId) {
    return getAll().filter(r => r.customerId === customerId);
  }

  return { getAll, add, removeByCustomer, getByCustomer };
})();


/**
 * Settings module
 */
const Settings = (() => {

  const KEY = 'ledger_settings';

  const defaults = {
    theme: 'light',
    currency: '₹',
    businessName: 'My Business',
    language: 'en'
  };

  function get() {
    return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  }

  function set(data) {
    const current = get();
    localStorage.setItem(KEY, JSON.stringify({ ...current, ...data }));
  }

  function applyTheme() {
    const s = get();
    document.documentElement.setAttribute('data-theme', s.theme);
  }

  return { get, set, applyTheme };
})();
