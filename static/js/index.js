let balancesVisible = false;
let balances = { Cooperative: 0, PiggyVest: 0, OPay: 0 };
let accountStats = {};

function calculateAccountStats(transactions) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const stats = {
    Cooperative: { depositsThisMonth: 0, lastDepositDate: null, lastDepositMonth: null },
    PiggyVest: { depositsThisMonth: 0, lastDepositDate: null, lastDepositMonth: null },
    OPay: { depositsThisMonth: 0, lastDepositDate: null, lastDepositMonth: null },
  };
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.transaction_date) - new Date(a.transaction_date)
  );
  sorted.forEach((tx) => {
    if (tx.transaction_type !== 'add') return;
    const txDate = new Date(tx.transaction_date);
    const name = tx.account_name;
    if (!stats[name]) {
      stats[name] = { depositsThisMonth: 0, lastDepositDate: null, lastDepositMonth: null };
    }
    if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
      stats[name].depositsThisMonth++;
    }
    if (!stats[name].lastDepositDate) {
      stats[name].lastDepositDate = txDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      stats[name].lastDepositMonth = txDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  });
  return stats;
}

function generateTickerText() {
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long' });
  const parts = [];
  Object.entries(accountStats).forEach(([account, stats]) => {
    if (stats.depositsThisMonth > 0) {
      parts.push(`✅ ${account}: ${stats.depositsThisMonth} deposit${stats.depositsThisMonth > 1 ? 's' : ''} in ${currentMonth}`);
    } else if (stats.lastDepositMonth) {
      parts.push(`⚠️ ${account}: No deposits yet in ${currentMonth} (last: ${stats.lastDepositMonth})`);
    } else {
      parts.push(`📝 ${account}: No deposits yet`);
    }
  });
  return parts.join('  |  ');
}

function updateTicker() {
  const text = generateTickerText();
  document.querySelectorAll('.ticker-text').forEach((el) => { el.textContent = text; });
}

function updateBalanceDisplays() {
  document.querySelectorAll('.account-card').forEach((card) => {
    const account = card.dataset.account;
    const amount = balances[account] || 0;
    const display = card.querySelector('.balance-display');
    display.dataset.amount = amount;
    const formatted = formatAmount(amount);
    const visible = card.querySelector('.toggle-balance').classList.contains('is-visible');
    display.textContent = visible ? `₦ ${formatted}` : '₦ •••••';
  });
}

function setupBalanceToggles() {
  document.querySelectorAll('.toggle-balance').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.account-card');
      const display = card.querySelector('.balance-display');
      const hidden = btn.querySelector('.eye-hidden');
      const visible = btn.querySelector('.eye-visible');
      const isVisible = btn.classList.toggle('is-visible');
      const amount = display.dataset.amount || 0;
      display.textContent = isVisible ? `₦ ${formatAmount(amount)}` : '₦ •••••';
      hidden.classList.toggle('hidden-ui', isVisible);
      visible.classList.toggle('hidden-ui', !isVisible);
      if (isVisible) {
        btn.style.backgroundColor = '';
      } else {
        btn.style.backgroundColor = btn.dataset.gradientFrom;
      }
    });
  });
}

async function fetchDashboardData() {
  const res = await fetch('/api/account/history', { credentials: 'include' });
  if (!res.ok) return;
  const data = await res.json();
  balances = { Cooperative: 0, PiggyVest: 0, OPay: 0, ...data.data.accountBalances };
  accountStats = calculateAccountStats(data.data.transactions || []);
  updateBalanceDisplays();
  updateTicker();
}

function showUI() {
  document.getElementById('app-loading').classList.add('hidden-ui');
  const overlay = document.getElementById('password-overlay');
  const dashboard = document.getElementById('main-dashboard');
  if (Auth.isAuthenticated) {
    overlay?.classList.add('hidden-ui');
    dashboard?.classList.remove('hidden-ui');
    fetchDashboardData();
    setupBalanceToggles();
  } else {
    overlay?.classList.remove('hidden-ui');
    dashboard?.classList.add('hidden-ui');
  }
}

document.addEventListener('auth:ready', showUI);
document.addEventListener('auth:login', () => window.location.reload());
