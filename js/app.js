/**
 * app.js
 * -----------------------------------------------------------------------
 * Application controller for home.html (the Admin Portal). Wires up the
 * drawer navigation, the three main views (Home / Add Items / All Items),
 * the Add New Product form, the offline scanner, and all stock in/out
 * flows. Delegates data operations to inventory.js and storage.js.
 * -----------------------------------------------------------------------
 */

const DPSApp = (() => {
  const CATEGORIES = ['Foods', 'Health', 'Beverages', 'Snacks', 'Supplies', 'Others'];
  const UNITS = ['Pieces', 'Pack', 'Box', 'Case', 'Carton', 'Bundle', 'Bottle', 'Sack'];
  const ACTIVITY_ICONS = {
    stock_in: { icon: 'move_to_inbox', color: 'var(--color-success)' },
    sold: { icon: 'point_of_sale', color: 'var(--color-red-600)' },
    damaged: { icon: 'report_problem', color: 'var(--color-danger)' },
    bo: { icon: 'schedule', color: 'var(--color-warning)' },
  };
  const ACTIVITY_LABELS = { stock_in: 'Stock In', sold: 'Sold', damaged: 'Damaged', bo: 'Back Order' };

  let currentView = 'home';
  let allItemsFilter = 'all';
  let allItemsQuery = '';
  let pickedImageData = null;

  const contentEl = () => document.getElementById('content');

  // ---------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------

  function setActiveDrawerItem(view) {
    document.querySelectorAll('.drawer-item[data-view]').forEach((el) => {
      el.classList.toggle('active', el.dataset.view === view);
    });
  }

  async function navigate(view) {
    currentView = view;
    setActiveDrawerItem(view);
    document.getElementById('drawer').classList.remove('open');
    document.getElementById('drawerScrim').classList.remove('open');

    if (view === 'home') return renderHome();
    if (view === 'add-items') return renderAddItems();
    if (view === 'all-items') return renderAllItems();
  }

  // ---------------------------------------------------------------------
  // HOME VIEW
  // ---------------------------------------------------------------------

  function animateCounter(el, target) {
    const duration = 700;
    const start = performance.now();
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const value = Math.floor(progress * target);
      el.textContent = value.toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target.toLocaleString();
    }
    requestAnimationFrame(step);
  }

  async function renderHome() {
    contentEl().innerHTML = `
      <div class="view page-enter">
        <div class="stat-grid" id="statGrid">
          ${['Total Products', 'Available Stocks', "Today's Stock In", "Today's Stock Out", 'Low Stocks', 'Sold', 'Damaged', 'B.O.']
            .map(() => `<div class="stat-card tone-ink"><div class="skeleton" style="width:60%;height:12px;"></div></div>`).join('')}
        </div>
        <div class="section-title">Recent Activities</div>
        <div id="activityList" class="stagger">${DPSUi.skeletonCards(3)}</div>
      </div>
    `;

    const stats = await DPSInventory.getDashboardStats();

    const cards = [
      { label: 'Total Products', value: stats.totalProducts, icon: 'inventory_2', tone: 'tone-red' },
      { label: 'Available Stocks', value: stats.availableStocks, icon: 'warehouse', tone: 'tone-ink' },
      { label: "Today's Stock In", value: stats.todayStockIn, icon: 'move_to_inbox', tone: 'tone-success' },
      { label: "Today's Stock Out", value: stats.todayStockOut, icon: 'outbox', tone: 'tone-warning' },
      { label: 'Low Stocks', value: stats.lowStocks, icon: 'production_quantity_limits', tone: 'tone-danger' },
      { label: 'Sold', value: stats.sold, icon: 'point_of_sale', tone: 'tone-gold' },
      { label: 'Damaged', value: stats.damaged, icon: 'report_problem', tone: 'tone-danger' },
      { label: 'B.O.', value: stats.bo, icon: 'schedule', tone: 'tone-info' },
    ];

    const statGrid = document.getElementById('statGrid');
    statGrid.innerHTML = cards.map((c) => `
      <div class="stat-card ${c.tone} anim-fade-slide-up">
        <span class="material-icons">${c.icon}</span>
        <div class="stat-value" data-target="${c.value}">0</div>
        <div class="stat-label">${c.label}</div>
      </div>
    `).join('');

    statGrid.querySelectorAll('.stat-value').forEach((el) => {
      animateCounter(el, Number(el.dataset.target));
    });

    const activityList = document.getElementById('activityList');
    if (stats.recentActivities.length === 0) {
      activityList.innerHTML = DPSUi.emptyState('history', 'No activity yet', 'Stock movements will appear here.');
    } else {
      activityList.innerHTML = `<div class="card stagger">` + stats.recentActivities.map((a) => {
        const meta = ACTIVITY_ICONS[a.type] || ACTIVITY_ICONS.stock_in;
        const sign = a.type === 'stock_in' ? '+' : '-';
        return `
          <div class="activity-item">
            <div class="activity-icon" style="background:${meta.color}">
              <span class="material-icons" style="font-size:20px;">${meta.icon}</span>
            </div>
            <div class="activity-body">
              <div class="activity-title">${a.productName}</div>
              <div class="activity-meta">${ACTIVITY_LABELS[a.type]} · ${new Date(a.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <div class="activity-qty" style="color:${meta.color}">${sign}${a.quantity}</div>
          </div>`;
      }).join('') + `</div>`;
    }
  }

  // ---------------------------------------------------------------------
  // ADD ITEMS VIEW (search existing + scan + add new)
  // ---------------------------------------------------------------------

  async function renderAddItems() {
    contentEl().innerHTML = `
      <div class="view page-enter">
        <div class="search-bar">
          <span class="material-icons">search</span>
          <input id="addItemsSearch" type="text" placeholder="Search by name or barcode..." value="${allItemsQuery}">
        </div>
        <div class="action-row">
          <button class="btn btn-outline btn-block ripple-surface" id="openScannerBtn">
            <span class="material-icons">qr_code_scanner</span> Scanner
          </button>
          <button class="btn btn-primary btn-block ripple-surface" id="openAddProductBtn">
            <span class="material-icons">add</span> Add New Item
          </button>
        </div>
        <div class="section-title">Products</div>
        <div id="addItemsResults" class="stagger">${DPSUi.skeletonCards(4)}</div>
      </div>
    `;

    document.getElementById('openScannerBtn').addEventListener('click', openScanner);
    document.getElementById('openAddProductBtn').addEventListener('click', () => openProductForm());

    const searchInput = document.getElementById('addItemsSearch');
    searchInput.addEventListener('input', debounce(() => {
      allItemsQuery = searchInput.value;
      renderAddItemsResults();
    }, 220));

    renderAddItemsResults();
  }

  async function renderAddItemsResults() {
    const list = document.getElementById('addItemsResults');
    if (!list) return;
    const products = await DPSInventory.searchProducts(allItemsQuery, 'all');

    if (products.length === 0) {
      list.innerHTML = DPSUi.emptyState('inventory', 'No products found', 'Try a different search or add a new item.');
      return;
    }

    list.innerHTML = products.map(productCardHtml).join('');
    attachProductCardEvents(list);
  }

  function productCardHtml(p) {
    const low = p.stockPieces > 0 && p.stockPieces <= DPSInventory.LOW_STOCK_THRESHOLD;
    const out = p.stockPieces <= 0;
    return `
      <div class="product-card ripple-surface" data-id="${p.id}">
        <div class="product-thumb">
          ${p.imageData ? `<img src="${p.imageData}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">` : `<span class="material-icons">inventory_2</span>`}
        </div>
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          <div class="product-meta">${p.category} · ${p.unit}</div>
          <div class="product-barcode">${p.barcode || 'No barcode'}</div>
        </div>
        <div class="product-stock">
          <div class="qty ${low ? 'low' : ''}" style="${out ? 'color:var(--color-danger)' : ''}">${p.stockPieces}</div>
          <div class="unit">${out ? 'Out of stock' : low ? 'Low stock' : 'pcs'}</div>
        </div>
      </div>
    `;
  }

  function attachProductCardEvents(container) {
    container.querySelectorAll('.product-card').forEach((card) => {
      card.addEventListener('click', () => openStockModal(card.dataset.id));
    });
  }

  // ---------------------------------------------------------------------
  // Scanner
  // ---------------------------------------------------------------------

  function openScanner() {
    const view = document.createElement('div');
    view.className = 'scanner-view anim-fade-in';
    view.innerHTML = `
      <div class="scanner-topbar">
        <button class="btn-icon ripple-surface" id="closeScannerBtn"><span class="material-icons">close</span></button>
      </div>
      <video class="scanner-video" autoplay playsinline muted></video>
      <div class="scanner-frame"><div class="scanner-line"></div></div>
      <div class="scanner-hint">Point your camera at a barcode or QR code</div>
    `;
    document.body.appendChild(view);

    const videoEl = view.querySelector('video');
    const close = () => { DPSScanner.stop(); view.remove(); };
    view.querySelector('#closeScannerBtn').addEventListener('click', close);

    if (!DPSScanner.isSupported()) {
      DPSToast.warning('Offline scanning is not supported on this device.');
      close();
      return;
    }

    DPSScanner.start(
      videoEl,
      async (code) => {
        close();
        const existing = await DPSInventory.findByBarcode(code);
        if (existing) {
          openStockModal(existing.id);
        } else {
          DPSToast.info('New barcode scanned — add product details');
          openProductForm({ barcode: code });
        }
      },
      (err) => {
        DPSToast.error(err.message || 'Camera error');
        close();
      }
    );
  }

  // ---------------------------------------------------------------------
  // Add / Edit Product form (bottom sheet)
  // ---------------------------------------------------------------------

  function openProductForm(prefill = {}) {
    pickedImageData = null;

    const { scrim, close } = DPSUi.openSheet(`
      <div class="modal-title">Add New Product</div>
      <div class="image-picker" id="imagePicker">
        <span class="material-icons">add_a_photo</span>
        <span style="font-size:12px;">Add product image</span>
        <input type="file" id="imageInput" accept="image/*" capture="environment" class="hidden">
      </div>
      <div class="field">
        <label>Category</label>
        <select id="fCategory">${CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('')}</select>
      </div>
      <div class="field">
        <label>Full Product Name</label>
        <input id="fName" type="text" placeholder="e.g. Coca-Cola 1.5L">
      </div>
      <div class="field">
        <label>Barcode / QR Code</label>
        <input id="fBarcode" type="text" placeholder="Scan or type code" value="${prefill.barcode || ''}">
      </div>
      <div class="field">
        <label>Unit</label>
        <select id="fUnit">${UNITS.map((u) => `<option value="${u}">${u}</option>`).join('')}</select>
      </div>
      <div class="field hidden" id="piecesPerUnitField">
        <label>Pieces Per Unit</label>
        <input id="fPiecesPerUnit" type="number" min="1" placeholder="e.g. 24">
      </div>
      <div class="field">
        <label id="qtyLabel">Stock Quantity</label>
        <input id="fQuantity" type="number" min="0" placeholder="0">
      </div>
      <button class="btn btn-primary btn-block btn-lg ripple-surface" id="saveProductBtn">
        <span class="material-icons">check</span> Save Product
      </button>
    `);

    const unitSelect = scrim.querySelector('#fUnit');
    const ppuField = scrim.querySelector('#piecesPerUnitField');
    const qtyLabel = scrim.querySelector('#qtyLabel');

    function toggleUnitFields() {
      const isPieces = unitSelect.value === 'Pieces';
      ppuField.classList.toggle('hidden', isPieces);
      qtyLabel.textContent = isPieces ? 'Stock Quantity (pieces)' : `Number of ${unitSelect.value}s`;
    }
    unitSelect.addEventListener('change', toggleUnitFields);
    toggleUnitFields();

    const imagePicker = scrim.querySelector('#imagePicker');
    const imageInput = scrim.querySelector('#imageInput');
    imagePicker.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', () => {
      const file = imageInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        pickedImageData = reader.result;
        imagePicker.innerHTML = `<img src="${reader.result}" alt="">`;
      };
      reader.readAsDataURL(file);
    });

    scrim.querySelector('#saveProductBtn').addEventListener('click', async () => {
      const name = scrim.querySelector('#fName').value.trim();
      const category = scrim.querySelector('#fCategory').value;
      const barcode = scrim.querySelector('#fBarcode').value.trim();
      const unit = unitSelect.value;
      const piecesPerUnit = scrim.querySelector('#fPiecesPerUnit').value;
      const quantity = scrim.querySelector('#fQuantity').value;

      if (!name) return DPSToast.error('Product name is required');
      if (unit !== 'Pieces' && (!piecesPerUnit || Number(piecesPerUnit) <= 0)) {
        return DPSToast.error('Enter pieces per unit');
      }
      if (quantity === '' || Number(quantity) < 0) return DPSToast.error('Enter a valid quantity');

      try {
        await DPSInventory.addProduct({
          name, category, barcode, unit, piecesPerUnit, quantity, imageData: pickedImageData,
        });
        DPSToast.success('Product saved successfully');
        close();
        if (currentView === 'add-items') renderAddItemsResults();
        if (currentView === 'all-items') renderAllItemsResults();
        if (currentView === 'home') renderHome();
      } catch (err) {
        DPSToast.error(err.message || 'Failed to save product');
      }
    });
  }

  // ---------------------------------------------------------------------
  // Stock In / Stock Out modal (opened from a found product)
  // ---------------------------------------------------------------------

  async function openStockModal(productId) {
    const product = await DPSStorage.getProduct(productId);
    if (!product) return DPSToast.error('Product not found');

    const { scrim, close } = DPSUi.openSheet(`
      <div class="modal-title">${product.name}</div>
      <div class="modal-text">
        ${product.category} · Current stock: <strong>${product.stockPieces} pcs</strong> (${product.stockUnits} ${product.unit})
      </div>
      <div class="field">
        <label>Quantity (in ${product.unit})</label>
        <input id="sQty" type="number" min="1" value="1">
      </div>
      <div class="field hidden" id="reasonField">
        <label>Stock Out Reason</label>
        <select id="sReason">
          <option value="sold">Sold</option>
          <option value="damaged">Damaged</option>
          <option value="bo">B.O. (Back Order)</option>
        </select>
      </div>
      <div class="action-row">
        <button class="btn btn-outline btn-block ripple-surface" id="stockOutBtn">
          <span class="material-icons">remove</span> Stock Out
        </button>
        <button class="btn btn-primary btn-block ripple-surface" id="stockInBtn">
          <span class="material-icons">add</span> Stock In
        </button>
      </div>
    `);

    const reasonField = scrim.querySelector('#reasonField');
    let mode = null;

    scrim.querySelector('#stockInBtn').addEventListener('click', () => {
      mode = 'in';
      reasonField.classList.add('hidden');
      commit();
    });

    scrim.querySelector('#stockOutBtn').addEventListener('click', () => {
      if (mode !== 'out-confirm') {
        mode = 'out-confirm';
        reasonField.classList.remove('hidden');
        DPSToast.info('Select a reason, then tap Stock Out again to confirm');
        return;
      }
      commit();
    });

    async function commit() {
      const qty = Number(scrim.querySelector('#sQty').value);
      if (!qty || qty <= 0) return DPSToast.error('Enter a valid quantity');

      try {
        if (mode === 'in') {
          await DPSInventory.stockIn(productId, qty);
          DPSToast.success('Stock in recorded');
        } else {
          const reason = scrim.querySelector('#sReason').value;
          await DPSInventory.stockOut(productId, qty, reason);
          DPSToast.success('Stock out recorded');
        }
        close();
        if (currentView === 'home') renderHome();
        if (currentView === 'add-items') renderAddItemsResults();
        if (currentView === 'all-items') renderAllItemsResults();
      } catch (err) {
        DPSToast.error(err.message || 'Transaction failed');
      }
    }
  }

  // ---------------------------------------------------------------------
  // ALL ITEMS VIEW
  // ---------------------------------------------------------------------

  async function renderAllItems() {
    contentEl().innerHTML = `
      <div class="view page-enter">
        <div class="search-bar">
          <span class="material-icons">search</span>
          <input id="allItemsSearch" type="text" placeholder="Search inventory..." value="${allItemsQuery}">
        </div>
        <div class="chip-row" id="filterChips">
          ${['all', 'available', 'low', 'out'].map((f) => `
            <div class="chip ripple-surface ${allItemsFilter === f ? 'active' : ''}" data-filter="${f}">
              ${{ all: 'All', available: 'Available', low: 'Low Stock', out: 'Out of Stock' }[f]}
            </div>`).join('')}
        </div>
        <div class="flex-between mt-2" style="margin-bottom:12px;">
          <span class="text-muted" style="font-size:13px;" id="resultCount">Loading...</span>
          <button class="btn btn-outline btn-sm ripple-surface" id="printBtn">
            <span class="material-icons" style="font-size:16px;">print</span> Print
          </button>
        </div>
        <div id="allItemsResults" class="stagger">${DPSUi.skeletonCards(5)}</div>
      </div>
    `;

    document.getElementById('allItemsSearch').addEventListener('input', debounce((e) => {
      allItemsQuery = e.target.value;
      renderAllItemsResults();
    }, 220));

    document.getElementById('filterChips').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      allItemsFilter = chip.dataset.filter;
      document.querySelectorAll('#filterChips .chip').forEach((c) => c.classList.toggle('active', c === chip));
      renderAllItemsResults();
    });

    document.getElementById('printBtn').addEventListener('click', async () => {
      const products = await DPSInventory.searchProducts(allItemsQuery, allItemsFilter);
      const label = { all: 'All Items', available: 'Available', low: 'Low Stock', out: 'Out of Stock' }[allItemsFilter];
      DPSPrint.printProducts(products, { filterLabel: label });
    });

    renderAllItemsResults();
  }

  async function renderAllItemsResults() {
    const list = document.getElementById('allItemsResults');
    const countEl = document.getElementById('resultCount');
    if (!list) return;

    const products = await DPSInventory.searchProducts(allItemsQuery, allItemsFilter);
    if (countEl) countEl.textContent = `${products.length} item${products.length === 1 ? '' : 's'} found`;

    if (products.length === 0) {
      list.innerHTML = DPSUi.emptyState('inventory_2', 'No items found', 'Adjust your search or filter.');
      return;
    }

    list.innerHTML = products.map(productCardHtml).join('');
    attachProductCardEvents(list);
  }

  // ---------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------

  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  // ---------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------

  function initLogout() {
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
      const ok = await DPSUi.confirmModal({
        title: 'Log out?',
        text: 'You will need to enter your PIN again to access the Admin Portal.',
        confirmLabel: 'Logout',
        cancelLabel: 'Cancel',
      });
      if (ok) window.location.href = 'login.html';
    });
  }

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------

  async function init() {
    await DPSStorage.ready();
    DPSUi.initRipples();
    DPSUi.initDrawer();
    initLogout();

    document.querySelectorAll('.drawer-item[data-view]').forEach((el) => {
      el.addEventListener('click', () => navigate(el.dataset.view));
    });

    navigate('home');
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', DPSApp.init);
