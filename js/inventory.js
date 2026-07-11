/**
 * inventory.js
 * -----------------------------------------------------------------------
 * Pure business logic for products, stock movements, and dashboard
 * statistics. Contains no DOM references — UI files (app.js) call into
 * this module and render the results.
 * -----------------------------------------------------------------------
 */

const DPSInventory = (() => {
  const LOW_STOCK_THRESHOLD = 10;

  function uid(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  // ---------------------------------------------------------------------
  // Product CRUD
  // ---------------------------------------------------------------------

  /**
   * Creates and persists a new product.
   * @param {object} data { name, category, barcode, unit, piecesPerUnit, quantity, imageData }
   */
  async function addProduct(data) {
    const piecesPerUnit = data.unit === 'Pieces' ? 1 : (Number(data.piecesPerUnit) || 1);
    const totalPieces = Number(data.quantity) * piecesPerUnit;

    const product = {
      id: uid('prod'),
      name: data.name.trim(),
      category: data.category,
      barcode: data.barcode?.trim() || '',
      unit: data.unit,
      piecesPerUnit,
      stockUnits: Number(data.quantity),
      stockPieces: totalPieces,
      imageData: data.imageData || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await DPSStorage.saveProduct(product);

    await DPSStorage.logActivity({
      id: uid('act'),
      productId: product.id,
      productName: product.name,
      type: 'stock_in',
      quantity: totalPieces,
      note: 'Initial stock on product creation',
      timestamp: Date.now(),
    });

    return product;
  }

  async function getAllProducts() {
    const products = await DPSStorage.getAllProducts();
    return products.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async function searchProducts(query, filter = 'all') {
    const products = await getAllProducts();
    const q = (query || '').trim().toLowerCase();

    let filtered = products;
    if (q) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    if (filter === 'available') filtered = filtered.filter((p) => p.stockPieces > 0);
    if (filter === 'low') filtered = filtered.filter((p) => p.stockPieces > 0 && p.stockPieces <= LOW_STOCK_THRESHOLD);
    if (filter === 'out') filtered = filtered.filter((p) => p.stockPieces <= 0);

    return filtered;
  }

  async function findByBarcode(barcode) {
    return DPSStorage.findProductByBarcode(barcode);
  }

  async function deleteProduct(id) {
    return DPSStorage.deleteProduct(id);
  }

  // ---------------------------------------------------------------------
  // Stock movements
  // ---------------------------------------------------------------------

  /** Adds stock to a product (Stock In). quantityUnits is in the product's own unit. */
  async function stockIn(productId, quantityUnits, note = '') {
    const product = await DPSStorage.getProduct(productId);
    if (!product) throw new Error('Product not found');

    const pieces = Number(quantityUnits) * product.piecesPerUnit;
    product.stockUnits += Number(quantityUnits);
    product.stockPieces += pieces;
    product.updatedAt = Date.now();
    await DPSStorage.saveProduct(product);

    await DPSStorage.logActivity({
      id: uid('act'),
      productId: product.id,
      productName: product.name,
      type: 'stock_in',
      quantity: pieces,
      note,
      timestamp: Date.now(),
    });

    return product;
  }

  /**
   * Removes stock from a product (Stock Out) under a reason category.
   * @param {string} reason 'sold' | 'damaged' | 'bo'
   */
  async function stockOut(productId, quantityUnits, reason, note = '') {
    const product = await DPSStorage.getProduct(productId);
    if (!product) throw new Error('Product not found');

    const pieces = Number(quantityUnits) * product.piecesPerUnit;
    if (pieces > product.stockPieces) {
      throw new Error('Insufficient stock for this transaction');
    }

    product.stockUnits = Math.max(0, product.stockUnits - Number(quantityUnits));
    product.stockPieces = Math.max(0, product.stockPieces - pieces);
    product.updatedAt = Date.now();
    await DPSStorage.saveProduct(product);

    await DPSStorage.logActivity({
      id: uid('act'),
      productId: product.id,
      productName: product.name,
      type: reason, // 'sold' | 'damaged' | 'bo'
      quantity: pieces,
      note,
      timestamp: Date.now(),
    });

    return product;
  }

  // ---------------------------------------------------------------------
  // Dashboard statistics
  // ---------------------------------------------------------------------

  async function getDashboardStats() {
    const [products, activities] = await Promise.all([
      getAllProducts(),
      DPSStorage.getAllActivities(),
    ]);

    const todayStart = startOfToday();
    const todayActivities = activities.filter((a) => a.timestamp >= todayStart);

    const sum = (arr, type) => arr.filter((a) => a.type === type).reduce((s, a) => s + a.quantity, 0);

    return {
      totalProducts: products.length,
      availableStocks: products.reduce((s, p) => s + p.stockPieces, 0),
      todayStockIn: sum(todayActivities, 'stock_in'),
      todayStockOut: sum(todayActivities, 'sold') + sum(todayActivities, 'damaged') + sum(todayActivities, 'bo'),
      lowStocks: products.filter((p) => p.stockPieces > 0 && p.stockPieces <= LOW_STOCK_THRESHOLD).length,
      sold: sum(activities, 'sold'),
      damaged: sum(activities, 'damaged'),
      bo: sum(activities, 'bo'),
      recentActivities: activities.slice(0, 8),
    };
  }

  return {
    LOW_STOCK_THRESHOLD,
    addProduct,
    getAllProducts,
    searchProducts,
    findByBarcode,
    deleteProduct,
    stockIn,
    stockOut,
    getDashboardStats,
    uid,
  };
})();

window.DPSInventory = DPSInventory;
