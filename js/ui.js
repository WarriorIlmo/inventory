/**
 * ui.js
 * -----------------------------------------------------------------------
 * Shared, presentation-only UI helpers used across every page:
 *   - Ripple click effect (event delegation, no per-button listeners)
 *   - Modal dialog controller (confirm dialogs, bottom sheets)
 *   - Drawer navigation controller
 *   - Skeleton loader helpers
 * Business logic lives in inventory.js / pin.js — this file only touches
 * the DOM.
 * -----------------------------------------------------------------------
 */

const DPSUi = (() => {
  // -----------------------------------------------------------------
  // Ripple effect — delegated to document so any .ripple-surface works
  // -----------------------------------------------------------------
  function initRipples() {
    document.addEventListener('pointerdown', (e) => {
      const surface = e.target.closest('.ripple-surface, .btn, .chip, .drawer-item, .stat-card, .product-card');
      if (!surface) return;

      const rect = surface.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height) * 1.4;
      const isDark = getComputedStyle(surface).color !== 'rgb(255, 255, 255)';

      ripple.className = 'ripple' + (isDark ? ' ripple-dark' : '');
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

      const prevPosition = getComputedStyle(surface).position;
      if (prevPosition === 'static') surface.style.position = 'relative';
      surface.style.overflow = surface.style.overflow || 'hidden';

      surface.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  }

  // -----------------------------------------------------------------
  // Modal controller
  // -----------------------------------------------------------------

  /**
   * Opens a confirmation modal.
   * @param {object} opts { title, text, confirmLabel, cancelLabel, danger }
   * @returns {Promise<boolean>} resolves true if confirmed
   */
  function confirmModal({ title, text, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) {
    return new Promise((resolve) => {
      const scrim = document.createElement('div');
      scrim.className = 'modal-scrim center';
      scrim.innerHTML = `
        <div class="modal anim-scale-in">
          <div class="modal-title">${title}</div>
          <div class="modal-text">${text}</div>
          <div class="modal-actions">
            <button class="btn btn-ghost ripple-surface" data-act="cancel">${cancelLabel}</button>
            <button class="btn ${danger ? 'btn-primary' : 'btn-primary'} ripple-surface" data-act="confirm">${confirmLabel}</button>
          </div>
        </div>
      `;
      document.body.appendChild(scrim);
      requestAnimationFrame(() => scrim.classList.add('open'));

      const close = (result) => {
        scrim.classList.remove('open');
        setTimeout(() => scrim.remove(), 250);
        resolve(result);
      };

      scrim.querySelector('[data-act="cancel"]').addEventListener('click', () => close(false));
      scrim.querySelector('[data-act="confirm"]').addEventListener('click', () => close(true));
      scrim.addEventListener('click', (e) => { if (e.target === scrim) close(false); });
    });
  }

  /**
   * Opens a custom bottom-sheet modal with provided inner HTML.
   * @returns {{scrim: HTMLElement, close: Function}}
   */
  function openSheet(innerHtml, { center = false } = {}) {
    const scrim = document.createElement('div');
    scrim.className = 'modal-scrim' + (center ? ' center' : '');
    scrim.innerHTML = `<div class="modal anim-scale-in">${center ? '' : '<div class="modal-handle"></div>'}${innerHtml}</div>`;
    document.body.appendChild(scrim);
    requestAnimationFrame(() => scrim.classList.add('open'));

    const close = () => {
      scrim.classList.remove('open');
      setTimeout(() => scrim.remove(), 250);
    };

    scrim.addEventListener('click', (e) => { if (e.target === scrim) close(); });
    return { scrim, close };
  }

  // -----------------------------------------------------------------
  // Drawer
  // -----------------------------------------------------------------
  function initDrawer() {
    const drawer = document.getElementById('drawer');
    const scrim = document.getElementById('drawerScrim');
    const openBtn = document.getElementById('menuBtn');
    if (!drawer || !scrim) return;

    const open = () => { drawer.classList.add('open'); scrim.classList.add('open'); };
    const close = () => { drawer.classList.remove('open'); scrim.classList.remove('open'); };

    openBtn?.addEventListener('click', open);
    scrim.addEventListener('click', close);

    return { open, close };
  }

  // -----------------------------------------------------------------
  // Skeleton loader generator
  // -----------------------------------------------------------------
  function skeletonCards(count = 4) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="product-card">
          <div class="skeleton" style="width:58px;height:58px;"></div>
          <div style="flex:1;">
            <div class="skeleton" style="width:70%;height:14px;margin-bottom:8px;"></div>
            <div class="skeleton" style="width:40%;height:11px;"></div>
          </div>
        </div>`;
    }
    return html;
  }

  function emptyState(icon, title, sub) {
    return `
      <div class="empty-state anim-fade-in">
        <span class="material-icons">${icon}</span>
        <div class="empty-title">${title}</div>
        <div class="empty-sub">${sub}</div>
      </div>`;
  }

  return { initRipples, confirmModal, openSheet, initDrawer, skeletonCards, emptyState };
})();

window.DPSUi = DPSUi;
