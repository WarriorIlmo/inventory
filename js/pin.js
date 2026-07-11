/**
 * pin.js
 * -----------------------------------------------------------------------
 * Drives the circular 4-digit PIN screen (login.html).
 * Verifies against the PIN stored in IndexedDB settings ("1234" default),
 * shakes + toasts on wrong entry, and redirects to home.html on success.
 * Also supports a "change PIN" mode used from Settings.
 * -----------------------------------------------------------------------
 */

(function () {
  const dotsEl = document.getElementById('pinDots');
  const keypad = document.getElementById('pinKeypad');
  const titleEl = document.getElementById('pinTitle');
  const subEl = document.getElementById('pinSub');

  let entered = '';
  let mode = 'login'; // 'login' | 'set-new' | 'confirm-new'
  let newPinBuffer = '';

  const params = new URLSearchParams(window.location.search);
  if (params.get('mode') === 'change') {
    mode = 'set-new';
    titleEl.textContent = 'Set New PIN';
    subEl.textContent = 'Enter a new 4-digit PIN';
  }

  function renderDots() {
    const dots = dotsEl.querySelectorAll('.pin-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('filled', i < entered.length);
    });
  }

  function shakeAndReset(message) {
    dotsEl.classList.add('anim-shake');
    DPSToast.error(message || 'Incorrect PIN');
    setTimeout(() => {
      dotsEl.classList.remove('anim-shake');
      entered = '';
      renderDots();
    }, 400);
  }

  async function handleComplete() {
    if (mode === 'login') {
      const storedPin = await DPSStorage.getSetting('pin', '1234');
      if (entered === storedPin) {
        DPSToast.success('Welcome back!');
        setTimeout(() => { window.location.href = 'home.html'; }, 400);
      } else {
        shakeAndReset('Incorrect PIN, try again');
      }
      return;
    }

    if (mode === 'set-new') {
      newPinBuffer = entered;
      entered = '';
      mode = 'confirm-new';
      titleEl.textContent = 'Confirm New PIN';
      subEl.textContent = 'Re-enter the new PIN to confirm';
      renderDots();
      return;
    }

    if (mode === 'confirm-new') {
      if (entered === newPinBuffer) {
        await DPSStorage.setSetting('pin', entered);
        DPSToast.success('PIN updated successfully');
        setTimeout(() => { window.location.href = 'home.html'; }, 500);
      } else {
        shakeAndReset('PINs did not match');
        mode = 'set-new';
        titleEl.textContent = 'Set New PIN';
        subEl.textContent = 'Enter a new 4-digit PIN';
      }
    }
  }

  keypad.addEventListener('click', (e) => {
    const key = e.target.closest('.pin-key');
    if (!key) return;

    if (key.dataset.key === 'back') {
      entered = entered.slice(0, -1);
      renderDots();
      return;
    }

    if (entered.length >= 4) return;

    entered += key.dataset.key;
    renderDots();

    if (entered.length === 4) {
      setTimeout(handleComplete, 180);
    }
  });

  // Initialize default PIN on first run.
  DPSStorage.ready().then(() => DPSStorage.ensureDefaultPin());
})();
