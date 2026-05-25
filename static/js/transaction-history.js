const accountFilter = window.ACCOUNT_FILTER || '';
let balancesVisible = false;
let historyData = null;

function updateClock() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
  const el = document.getElementById('current-time');
  if (el) el.textContent = `${displayHours}:${displayMinutes} ${ampm}`;
}

function renderBalances() {
  const grid = document.getElementById('balances-grid');
  if (!historyData || !grid) return;
  const mask = balancesVisible;
  let html = `
    <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 md:p-4 rounded-lg shadow-lg">
      <h3 class="text-sm md:text-lg font-semibold">Total Balance</h3>
      <p class="text-lg md:text-2xl font-bold">${mask ? `₦${historyData.totalBalance.toLocaleString()}` : '₦ •••••'}</p>
    </div>`;
  Object.entries(historyData.accountBalances).forEach(([account, balance]) => {
    html += `
      <div class="bg-gradient-to-r from-green-500 to-green-600 text-white p-3 md:p-4 rounded-lg shadow-lg">
        <h3 class="text-sm md:text-lg font-semibold">${account}</h3>
        <p class="text-base md:text-xl font-bold">${mask ? `₦${balance.toLocaleString()}` : '₦ •••••'}</p>
      </div>`;
  });
  grid.innerHTML = html;
}

function renderTransactions() {
  const container = document.getElementById('transactions-container');
  if (!historyData || !container) return;

  if (historyData.transactions.length === 0) {
    container.innerHTML = `
      <div class="text-center py-6 md:py-8">
        <svg class="w-12 h-12 md:w-16 md:h-16 mx-auto text-gray-400 mb-3 md:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <h3 class="text-base md:text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
        <p class="text-gray-500 text-sm md:text-base">Start by adding some money to your accounts!</p>
      </div>`;
    return;
  }

  let html = `
    <div class="space-y-3 md:space-y-4">
      <h2 class="text-base sm:text-lg md:text-xl font-semibold text-gray-800 mb-3 md:mb-4">
        Recent Transactions (${historyData.transactions.length})
      </h2>`;

  historyData.transactions.forEach((tx) => {
    const typeClass = tx.transaction_type === 'add'
      ? 'bg-green-100 text-green-800'
      : tx.transaction_type === 'subtract'
        ? 'bg-red-100 text-red-800'
        : 'bg-gray-100 text-gray-800';
    const typeLabel = tx.transaction_type === 'add' ? '+ Deposit' : tx.transaction_type === 'subtract' ? '- Withdrawal' : tx.transaction_type;
    const dateStr = new Date(tx.transaction_date).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    html += `
      <div class="border-2 border-gray-200 rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-5 hover:shadow-xl hover:border-blue-300 transition-all duration-300">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="flex flex-wrap items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <span class="px-2 sm:px-3 md:px-4 py-1 md:py-1.5 rounded-full text-xs sm:text-sm md:text-base font-semibold ${typeClass}">${typeLabel}</span>
              ${!accountFilter ? `<span class="text-xs sm:text-sm md:text-base font-medium text-blue-600 bg-blue-50 px-2 md:px-3 py-0.5 md:py-1 rounded-full">${tx.account_name}</span>` : ''}
            </div>
            <p class="text-gray-900 font-bold text-lg sm:text-xl md:text-2xl mb-1 md:mb-2">₦${tx.amount.toLocaleString()}</p>
            ${tx.note ? `<p class="text-gray-700 text-sm md:text-base mt-1 md:mt-2 italic">"${tx.note}"</p>` : ''}
            <p class="text-gray-500 text-xs md:text-sm mt-2 md:mt-3 flex items-center gap-1 md:gap-2">
              <svg class="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              ${dateStr}
            </p>
          </div>
        </div>
      </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

async function fetchHistory() {
  const url = accountFilter
    ? `/api/account/history?account=${encodeURIComponent(accountFilter)}`
    : '/api/account/history';
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (res.ok) {
    const data = await res.json();
    historyData = data.data;
    return true;
  }
  const err = await res.json().catch(() => ({}));
  document.getElementById('error-message').textContent = err.message || err.error || 'Failed to load transaction history';
  return false;
}

function setupToggle() {
  const btn = document.getElementById('toggle-balances');
  const showIcon = document.getElementById('toggle-icon-show');
  const hideIcon = document.getElementById('toggle-icon-hide');
  btn.addEventListener('click', () => {
    balancesVisible = !balancesVisible;
    showIcon.classList.toggle('hidden-ui', balancesVisible);
    hideIcon.classList.toggle('hidden-ui', !balancesVisible);
    renderBalances();
  });
}

async function onAuthReady() {
  if (!Auth.isAuthenticated) {
    window.location.href = '/';
    return;
  }

  const title = document.getElementById('page-title');
  if (accountFilter) {
    title.innerHTML = `Transaction History <span class="text-lg sm:text-xl md:text-2xl text-gray-600 block sm:inline"> - ${accountFilter}</span>`;
  }

  updateClock();
  setInterval(updateClock, 1000);

  const ok = await fetchHistory();
  document.getElementById('page-loading').classList.add('hidden-ui');

  if (!ok) {
    document.getElementById('error-panel').classList.remove('hidden-ui');
    return;
  }

  document.getElementById('history-page').classList.remove('hidden-ui');
  document.getElementById('history-content').classList.remove('hidden-ui');
  setupToggle();
  renderBalances();
  renderTransactions();
}

document.addEventListener('auth:ready', onAuthReady);
