/**
 * storage.js
 * -----------------------------------------------------------------------
 * Offline-first data layer for DPS-INVENTORY, built entirely on IndexedDB.
 * No network calls are ever made from this module. All reads/writes are
 * local to the device, so the app works with zero connectivity.
 *
 * Object stores:
 *   - products   : inventory items
 *   - activities : stock in / stock out / sold / damaged / B.O. log
 *   - settings   : app preferences (PIN, business name, etc.)
 *
 * Exposed as a singleton `DPSStorage` on window, and as an ES module export.
 * -----------------------------------------------------------------------
 */

const DB_NAME = 'dps_inventory_db';
const DB_VERSION = 1;

class StorageService {
  constructor() {
    this.db = null;
    this._ready = this._open();
  }

  /** Opens (and if necessary upgrades) the IndexedDB database. */
  _open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('products')) {
          const products = db.createObjectStore('products', { keyPath: 'id' });
          products.createIndex('barcode', 'barcode', { unique: false });
          products.createIndex('name', 'name', { unique: false });
          products.createIndex('category', 'category', { unique: false });
        }

        if (!db.objectStoreNames.contains('activities')) {
          const activities = db.createObjectStore('activities', { keyPath: 'id' });
          activities.createIndex('productId', 'productId', { unique: false });
          activities.createIndex('type', 'type', { unique: false });
          activities.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /** Resolves once the database is ready for use. */
  async ready() {
    await this._ready;
    return this.db;
  }

  _tx(storeName, mode = 'readonly') {
    return this.db.transaction(storeName, mode).objectStore(storeName);
  }

  // ---------------------------------------------------------------------
  // Generic CRUD helpers
  // ---------------------------------------------------------------------

  async put(storeName, value) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const req = this._tx(storeName, 'readwrite').put(value);
      req.onsuccess = () => resolve(value);
      req.onerror = () => reject(req.error);
    });
  }

  async get(storeName, key) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const req = this._tx(storeName).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async getAll(storeName) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const req = this._tx(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async delete(storeName, key) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const req = this._tx(storeName, 'readwrite').delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async clear(storeName) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const req = this._tx(storeName, 'readwrite').clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  // ---------------------------------------------------------------------
  // Products
  // ---------------------------------------------------------------------

  async saveProduct(product) {
    return this.put('products', product);
  }

  async getProduct(id) {
    return this.get('products', id);
  }

  async getAllProducts() {
    return this.getAll('products');
  }

  async deleteProduct(id) {
    return this.delete('products', id);
  }

  async findProductByBarcode(barcode) {
    const all = await this.getAllProducts();
    return all.find((p) => p.barcode === barcode) || null;
  }

  // ---------------------------------------------------------------------
  // Activities
  // ---------------------------------------------------------------------

  async logActivity(activity) {
    return this.put('activities', activity);
  }

  async getAllActivities() {
    const all = await this.getAll('activities');
    return all.sort((a, b) => b.timestamp - a.timestamp);
  }

  async getRecentActivities(limit = 8) {
    const all = await this.getAllActivities();
    return all.slice(0, limit);
  }

  // ---------------------------------------------------------------------
  // Settings (PIN, business info, preferences)
  // ---------------------------------------------------------------------

  async getSetting(key, fallback = null) {
    const row = await this.get('settings', key);
    return row ? row.value : fallback;
  }

  async setSetting(key, value) {
    return this.put('settings', { key, value });
  }

  /** Ensures a default PIN (1234) exists on first run. */
  async ensureDefaultPin() {
    const existing = await this.getSetting('pin');
    if (!existing) {
      await this.setSetting('pin', '1234');
    }
  }
}

// Singleton instance shared across pages/modules.
window.DPSStorage = new StorageService();
