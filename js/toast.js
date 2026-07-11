/**
 * toast.js
 * -----------------------------------------------------------------------
 * Animated bottom-floating toast notification system.
 * Replaces the use of alert() anywhere in the app.
 * -----------------------------------------------------------------------
 */

class ToastManager {
  constructor() {
    this.stack = null;
    this.icons = {
      success: 'check_circle',
      error: 'error',
      warning: 'warning',
      info: 'info',
    };
  }

  _ensureStack() {
    if (this.stack) return this.stack;
    const el = document.createElement('div');
    el.className = 'toast-stack';
    document.body.appendChild(el);
    this.stack = el;
    return el;
  }

  /**
   * Shows a toast notification.
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {number} duration ms before auto-dismiss
   */
  show(message, type = 'info', duration = 2600) {
    const stack = this._ensureStack();
    const toast = document.createElement('div');
    toast.className = `toast anim-toast ${type}`;
    toast.innerHTML = `
      <span class="material-icons">${this.icons[type] || 'info'}</span>
      <span>${message}</span>
    `;
    stack.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  success(msg, duration) { this.show(msg, 'success', duration); }
  error(msg, duration) { this.show(msg, 'error', duration); }
  warning(msg, duration) { this.show(msg, 'warning', duration); }
  info(msg, duration) { this.show(msg, 'info', duration); }
}

window.DPSToast = new ToastManager();
