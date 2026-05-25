/**
 * Shared auth, API helpers, toasts, and inactivity logout
 */
const API_BASE = '/api';
const INACTIVITY_TIMEOUT = 5 * 60 * 1000;

const Auth = {
  isAuthenticated: false,
  isLoading: true,
  error: null,
  lastActivity: Date.now(),

  async checkStatus() {
    try {
      const res = await fetch(`${API_BASE}/auth/status`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        this.isAuthenticated = !!data.authenticated;
        if (this.isAuthenticated) this.lastActivity = Date.now();
      } else {
        this.isAuthenticated = false;
      }
    } catch {
      this.isAuthenticated = false;
    } finally {
      this.isLoading = false;
      document.dispatchEvent(new CustomEvent('auth:ready'));
    }
  },

  async login(password) {
    try {
      const res = await fetch(`${API_BASE}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        this.isAuthenticated = true;
        this.error = null;
        this.lastActivity = Date.now();
        document.dispatchEvent(new CustomEvent('auth:login'));
        return true;
      }
      this.error = 'Incorrect password. Please try again.';
      document.dispatchEvent(new CustomEvent('auth:error'));
      return false;
    } catch {
      this.error = 'Unable to verify password. Please check your connection and try again.';
      document.dispatchEvent(new CustomEvent('auth:error'));
      return false;
    }
  },

  async logout() {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      /* continue */
    }
    this.isAuthenticated = false;
    this.error = null;
    document.dispatchEvent(new CustomEvent('auth:logout'));
    window.location.href = '/';
  },

  initInactivity() {
    const update = () => { this.lastActivity = Date.now(); };
    ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'].forEach((ev) => {
      window.addEventListener(ev, update);
    });
    setInterval(() => {
      if (this.isAuthenticated && Date.now() - this.lastActivity > INACTIVITY_TIMEOUT) {
        this.logout();
      }
    }, 10000);
  },
};

function showToast({ title, description, variant }) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast${variant === 'destructive' ? ' destructive' : ''}`;
  el.innerHTML = `<div class="toast-title">${title}</div>${description ? `<div class="toast-description">${description}</div>` : ''}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function formatAmount(num) {
  return Number(num || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function showLoadingScreen(message = 'Loading...') {
  return `
    <div class="min-h-screen bg-background/72 flex items-center justify-center" style="background-color: hsla(0,0%,85%,0.72)">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p class="mt-4 text-gray-600">${message}</p>
      </div>
    </div>`;
}

document.addEventListener('DOMContentLoaded', () => {
  Auth.initInactivity();
  Auth.checkStatus();

  const overlayForm = document.getElementById('password-form');
  if (overlayForm) {
    overlayForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('password');
      const btn = document.getElementById('unlock-btn');
      const errEl = document.getElementById('auth-error');
      btn.disabled = true;
      btn.textContent = 'Verifying...';
      errEl?.classList.add('hidden-ui');
      const ok = await Auth.login(input.value);
      if (!ok && errEl) {
        errEl.querySelector('p').textContent = Auth.error;
        errEl.classList.remove('hidden-ui');
      }
      btn.disabled = false;
      btn.textContent = 'Unlock';
      input.value = '';
      if (ok) window.location.reload();
    });
  }

  document.getElementById('logout-btn')?.addEventListener('click', () => Auth.logout());
});
