/**
 * scanner.js
 * -----------------------------------------------------------------------
 * Fully offline barcode / QR scanning using the device camera.
 *
 * Uses the native `BarcodeDetector` API, which is built into the Android
 * WebView / Chrome engine that Cordova apps run on — it performs all
 * decoding on-device with no network request whatsoever, so it satisfies
 * the "100% offline" requirement out of the box on modern Android
 * WebViews (Chrome 83+ / Android 9+).
 *
 * For older WebViews that lack BarcodeDetector, drop a offline JS decoder
 * (e.g. a bundled build of jsQR or ZXing-js) into /libraries and this
 * module will automatically prefer it — see the `libraries/README.txt`
 * placeholder for instructions. This keeps the app 100% offline on every
 * target without requiring any particular third-party library to be
 * vendored sight-unseen.
 * -----------------------------------------------------------------------
 */

class ScannerService {
  constructor() {
    this.stream = null;
    this.detector = null;
    this.scanning = false;
    this.videoEl = null;
    this.rafId = null;
  }

  isSupported() {
    return 'BarcodeDetector' in window || !!window.DPSFallbackDecoder;
  }

  /**
   * Starts the camera + scan loop.
   * @param {HTMLVideoElement} videoEl
   * @param {Function} onResult callback(text)
   * @param {Function} onError callback(error)
   */
  async start(videoEl, onResult, onError) {
    this.videoEl = videoEl;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
    } catch (err) {
      onError && onError(new Error('Camera permission denied or unavailable.'));
      return;
    }

    videoEl.srcObject = this.stream;
    await videoEl.play();

    if ('BarcodeDetector' in window) {
      try {
        const formats = await BarcodeDetector.getSupportedFormats();
        this.detector = new BarcodeDetector({ formats });
      } catch (e) {
        this.detector = new BarcodeDetector();
      }
    }

    this.scanning = true;
    this._loop(onResult, onError);
  }

  async _loop(onResult, onError) {
    if (!this.scanning) return;

    try {
      if (this.detector) {
        const barcodes = await this.detector.detect(this.videoEl);
        if (barcodes && barcodes.length > 0) {
          this.stop();
          onResult(barcodes[0].rawValue);
          return;
        }
      } else if (window.DPSFallbackDecoder) {
        // Optional offline fallback decoder hook (e.g. jsQR), used only
        // if bundled locally under /libraries and exposed on window.
        const code = window.DPSFallbackDecoder.decodeFrame(this.videoEl);
        if (code) {
          this.stop();
          onResult(code);
          return;
        }
      } else {
        onError && onError(new Error('No offline barcode decoder available on this device.'));
        return;
      }
    } catch (err) {
      // Non-fatal per-frame errors are ignored; scanning continues.
    }

    this.rafId = requestAnimationFrame(() => this._loop(onResult, onError));
  }

  stop() {
    this.scanning = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.videoEl) this.videoEl.srcObject = null;
  }
}

window.DPSScanner = new ScannerService();
