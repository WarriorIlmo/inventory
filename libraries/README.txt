DPS-INVENTORY — Libraries Folder
==================================

cordova.js
----------
Placeholder only — see libraries/cordova.js for details. The real file
is generated automatically by the Cordova CLI when you build the
Android platform. Do not hand-edit it.

Optional offline barcode decoder fallback
------------------------------------------
js/scanner.js uses the native `BarcodeDetector` browser API by default,
which decodes barcodes/QR codes fully on-device (no network) on modern
Android WebViews (Chrome 83+ / Android 9+).

If you need to support older Android WebViews that lack
`BarcodeDetector`, drop an offline JS decoder library here (for example
a self-hosted build of jsQR or ZXing-js) and expose it on
`window.DPSFallbackDecoder` with a `decodeFrame(videoElement)` method
that returns a decoded string or null. scanner.js will automatically
prefer `BarcodeDetector` when available and fall back to this hook
otherwise — no other code changes are required.

Example wiring (add near the bottom of your bundled library file):

    window.DPSFallbackDecoder = {
      decodeFrame(videoEl) {
        // draw videoEl to an offscreen canvas, run your decoder,
        // return the decoded text or null
      }
    };

Then include the library's <script> tag in home.html before js/scanner.js.
