/**
 * reports.js - Reports & analytics page
 * Uses Chart.js for visualizations
 */

const ReportsPage = (() => {

  function init() {
    Auth.requireAuth();
    Settings.applyTheme();
    renderStats();
    renderMonthlyChart();
    renderTopCustomers();
    renderBalanceTrend();
  }

  function renderStats() {
    const all = Transactions.getAll();
    const customers = Customers.getAll();
    let totalGave = 0, totalGot = 0;

    all.forEach(t => {
      if (t.type === 'gave') totalGave += t.amount;
      else totalGot += t.amount;
    });

    const currency = Settings.get().currency;
    document.getElementById('stat-total-gave').textContent = currency + totalGave.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    document.getElementById('stat-total-got').textContent = currency + totalGot.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    document.getElementById('stat-net-balance').textContent = currency + Math.abs(totalGot - totalGave).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    document.getElementById('stat-customers').textContent = customers.length;
  }

  function renderMonthlyChart() {
    const ctx = document.getElementById('monthly-chart');
    if (!ctx) return;

    const monthly = Transactions.getMonthlySummary();
    const labels = Object.keys(monthly).sort().slice(-6);

    // If no data, show placeholder
    if (labels.length === 0) {
      // Add sample data for demo
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toISOString().slice(0, 7);
        if (!monthly[key]) monthly[key] = { gave: Math.random() * 5000 + 1000, got: Math.random() * 4000 + 800 };
        labels.push(key);
      }
    }

    const gaveData = labels.map(m => monthly[m]?.gave || 0);
    const gotData = labels.map(m => monthly[m]?.got || 0);
    const friendlyLabels = labels.map(m => {
      const [y, mo] = m.split('-');
      return new Date(y, mo - 1).toLocaleString('en-IN', { month: 'short', year: '2-digit' });
    });

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#94A3B8' : '#6B7280';

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: friendlyLabels,
        datasets: [
          {
            label: 'You Gave',
            data: gaveData,
            backgroundColor: 'rgba(239,68,68,0.7)',
            borderRadius: 6,
            borderSkipped: false
          },
          {
            label: 'You Got',
            data: gotData,
            backgroundColor: 'rgba(16,185,129,0.7)',
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { labels: { color: textColor, font: { size: 12 } } }
        },
        scales: {
          x: { ticks: { color: textColor }, grid: { color: gridColor } },
          y: { ticks: { color: textColor }, grid: { color: gridColor } }
        }
      }
    });
  }

  function renderTopCustomers() {
    const container = document.getElementById('top-customers-list');
    if (!container) return;

    const customers = Customers.getAll();
    const currency = Settings.get().currency;

    if (customers.length === 0) {
      container.innerHTML = '<p class="text-muted" style="padding:12px;font-size:14px;">No customers yet</p>';
      return;
    }

    const sorted = customers
      .map(c => ({ ...c, abs: Math.abs(c.balance || 0) }))
      .sort((a, b) => b.abs - a.abs)
      .slice(0, 5);

    container.innerHTML = sorted.map((c, i) => {
      const bal = c.balance || 0;
      const colorClass = bal > 0 ? 'balance-green' : bal < 0 ? 'balance-red' : 'balance-zero';
      const label = bal > 0 ? 'will get' : bal < 0 ? 'will give' : 'settled';
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-color)">
          <div style="width:28px;height:28px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:700;flex-shrink:0">${i + 1}</div>
          <div class="contact-avatar avatar-${c.avatarColor}" style="width:38px;height:38px;font-size:14px;margin:0">${c.name.charAt(0).toUpperCase()}</div>
          <div style="flex:1">
            <p style="margin:0;font-size:14px;font-weight:600;color:var(--text-primary)">${c.name}</p>
            <p style="margin:0;font-size:12px;color:var(--text-muted)">${label}</p>
          </div>
          <span class="${colorClass}" style="font-weight:700;font-size:14px">${currency}${c.abs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>`;
    }).join('');
  }

  function renderBalanceTrend() {
    const ctx = document.getElementById('balance-chart');
    if (!ctx) return;

    const txns = Transactions.getAll().sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
    let runningBalance = 0;
    const points = [];
    const labels = [];

    if (txns.length === 0) {
      // Sample data
      for (let i = 0; i < 8; i++) {
        const v = (Math.random() - 0.4) * 2000;
        runningBalance += v;
        points.push(Math.round(runningBalance));
        labels.push('Day ' + (i + 1));
      }
    } else {
      txns.slice(-12).forEach(t => {
        if (t.type === 'gave') runningBalance -= t.amount;
        else runningBalance += t.amount;
        points.push(runningBalance);
        const d = new Date(t.date);
        labels.push(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
      });
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#94A3B8' : '#6B7280';

    new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Net Balance',
          data: points,
          borderColor: '#6366F1',
          backgroundColor: 'rgba(99,102,241,0.12)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#6366F1',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { labels: { color: textColor, font: { size: 12 } } }
        },
        scales: {
          x: { ticks: { color: textColor }, grid: { color: gridColor } },
          y: { ticks: { color: textColor }, grid: { color: gridColor } }
        }
      }
    });
  }

  return { init };
})();
