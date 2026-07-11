/**
 * print.js
 * -----------------------------------------------------------------------
 * Builds a professional printable HTML report of the current inventory
 * (respecting whatever filter/search is active in All Items) and opens
 * it in a new window for the browser's native print dialog. Works fully
 * offline and is compatible with Android WebView print rendering.
 * -----------------------------------------------------------------------
 */

const DPSPrint = (() => {
  function fmtDate(ts) {
    return new Date(ts).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function buildReportHtml(products, meta) {
    const rows = products.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${p.barcode || '—'}</td>
        <td>${p.unit}</td>
        <td class="num">${p.stockUnits}</td>
        <td class="num">${p.stockPieces}</td>
      </tr>
    `).join('');

    const totalPieces = products.reduce((s, p) => s + p.stockPieces, 0);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>DPS-INVENTORY Report</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #241A1B; margin: 32px; }
          .report-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #A11D2E; padding-bottom: 16px; margin-bottom: 20px; }
          .report-header h1 { color: #A11D2E; margin: 0 0 4px; font-size: 22px; }
          .report-header .sub { color: #6B0F1A; font-size: 12px; }
          .meta { text-align: right; font-size: 12px; color: #555; }
          .summary { display: flex; gap: 16px; margin-bottom: 20px; }
          .summary div { background: #FBE7E9; padding: 10px 16px; border-radius: 8px; font-size: 13px; }
          .summary strong { display: block; font-size: 16px; color: #A11D2E; }
          table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
          th, td { border: 1px solid #ECE2E1; padding: 8px 10px; text-align: left; }
          th { background: #A11D2E; color: #fff; }
          td.num, th.num { text-align: right; }
          tfoot td { font-weight: bold; background: #FBF9F7; }
          @media print {
            body { margin: 10mm; }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div>
            <h1>DPS-INVENTORY</h1>
            <div class="sub">Inventory Stock Report ${meta.filterLabel ? `— ${meta.filterLabel}` : ''}</div>
          </div>
          <div class="meta">
            Date generated: ${fmtDate(Date.now())}<br>
            Total items listed: ${products.length}
          </div>
        </div>

        <div class="summary">
          <div><strong>${products.length}</strong>Products</div>
          <div><strong>${totalPieces}</strong>Total Stock (pcs)</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th><th>Product Name</th><th>Category</th><th>Barcode</th>
              <th>Unit</th><th class="num">Units</th><th class="num">Pieces</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:#999;">No items to display</td></tr>'}</tbody>
          <tfoot>
            <tr><td colspan="6">Total Stock (pieces)</td><td class="num">${totalPieces}</td></tr>
          </tfoot>
        </table>
      </body>
      </html>
    `;
  }

  /** Opens the printable report in a new window and triggers print(). */
  function printProducts(products, meta = {}) {
    const html = buildReportHtml(products, meta);
    const win = window.open('', '_blank');
    if (!win) {
      DPSToast.error('Unable to open print preview. Allow pop-ups and try again.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 350);
  }

  return { printProducts };
})();

window.DPSPrint = DPSPrint;
