const ICON_MAP = window.ICON_URLS || {};

let transactionType = 'add';
let showAmount = true;
const sourceFromUrl = window.PAGE_SOURCE || '';

function initPage() {
  const accountName = sourceFromUrl || 'Cooperative';
  const icon = ICON_MAP[accountName] || ICON_MAP.Cooperative;

  document.getElementById('accountName').value = accountName;
  document.getElementById('accountName').disabled = !!sourceFromUrl;
  document.getElementById('dateTime').value = new Date().toISOString().slice(0, 16);
  document.getElementById('panel-icon').src = icon;
  document.getElementById('panel-icon').alt = accountName;
  document.getElementById('mobile-icon').src = icon;
  document.getElementById('mobile-icon').alt = accountName;

  document.getElementById('btn-add').addEventListener('click', () => setTransactionType('add'));
  document.getElementById('btn-subtract').addEventListener('click', () => setTransactionType('subtract'));

  document.getElementById('amount').addEventListener('input', (e) => {
    const v = e.target.value;
    if (v === '' || /^\d*\.?\d*$/.test(v)) return;
    e.target.value = v.slice(0, -1);
  });

  document.getElementById('toggle-amount-visibility').addEventListener('click', () => {
    showAmount = !showAmount;
    const input = document.getElementById('amount');
    input.type = showAmount ? 'text' : 'password';
    document.getElementById('icon-eye-off').classList.toggle('hidden-ui', !showAmount);
    document.getElementById('icon-eye').classList.toggle('hidden-ui', showAmount);
  });

  document.getElementById('save-btn').addEventListener('click', handleSave);
}

function setTransactionType(type) {
  transactionType = type;
  const addBtn = document.getElementById('btn-add');
  const subBtn = document.getElementById('btn-subtract');
  if (type === 'add') {
    addBtn.className = 'flex-1 rounded-lg text-sm md:text-body font-semibold transition-all py-3 bg-green-600 hover:bg-green-700 text-white';
    subBtn.className = 'flex-1 rounded-lg text-sm md:text-body font-semibold transition-all py-3 bg-gray-200 hover:bg-gray-300 text-gray-700';
  } else {
    subBtn.className = 'flex-1 rounded-lg text-sm md:text-body font-semibold transition-all py-3 bg-red-600 hover:bg-red-700 text-white';
    addBtn.className = 'flex-1 rounded-lg text-sm md:text-body font-semibold transition-all py-3 bg-gray-200 hover:bg-gray-300 text-gray-700';
  }
}

async function handleSave() {
  const btn = document.getElementById('save-btn');
  const label = document.getElementById('save-label');
  const formData = {
    accountName: document.getElementById('accountName').value,
    amount: document.getElementById('amount').value,
    note: document.getElementById('note').value,
    dateTime: document.getElementById('dateTime').value,
    transactionType,
  };

  btn.disabled = true;
  label.textContent = 'Saving...';

  try {
    const res = await fetch('/api/account/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(formData),
    });

    if (res.status === 401 || res.status === 403) {
      showToast({ title: 'Session Expired', description: 'Your session has expired. Please login again.', variant: 'destructive' });
      window.location.href = '/';
      return;
    }

    const result = await res.json();
    if (result.success) {
      showToast({ title: 'Success', description: 'Account updated successfully!' });
      window.location.href = '/';
    } else {
      showToast({ title: 'Error', description: result.message || 'Failed to update account', variant: 'destructive' });
    }
  } catch {
    showToast({ title: 'Error', description: 'Failed to connect to server', variant: 'destructive' });
  } finally {
    btn.disabled = false;
    label.textContent = 'Save Changes';
  }
}

function onAuthReady() {
  document.getElementById('page-loading').classList.add('hidden-ui');
  if (!Auth.isAuthenticated) {
    showToast({ title: 'Session Expired', description: 'Your session has expired. Please login again.', variant: 'destructive' });
    window.location.href = '/';
    return;
  }
  document.getElementById('update-page').classList.remove('hidden-ui');
  initPage();
}

document.addEventListener('auth:ready', onAuthReady);
