/**
 * Scanner Module - Snapshot-based Barcode Scanning using ZXing-js
 * 
 * Uses ZXing library for more reliable barcode detection.
 * Takes a snapshot of the camera feed and processes it for barcodes.
 */

const Scanner = (function () {
    let codeReader = null;
    let videoStream = null;
    let videoElement = null;
    let canvasElement = null;
    let onDetectCallback = null;
    let isCameraActive = false;

    /**
     * Initialize ZXing code reader
     */
    function initCodeReader() {
        if (!codeReader && typeof ZXing !== 'undefined') {
            const hints = new Map();
            const formats = [
                ZXing.BarcodeFormat.QR_CODE,
                ZXing.BarcodeFormat.EAN_13,
                ZXing.BarcodeFormat.EAN_8,
                ZXing.BarcodeFormat.UPC_A,
                ZXing.BarcodeFormat.UPC_E,
                ZXing.BarcodeFormat.CODE_128,
                ZXing.BarcodeFormat.CODE_39,
                ZXing.BarcodeFormat.CODE_93,
                ZXing.BarcodeFormat.CODABAR,
                ZXing.BarcodeFormat.ITF
            ];
            hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
            hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
            codeReader = new ZXing.BrowserMultiFormatReader(hints);
        }
        return codeReader;
    }

    /**
     * Initialize and start the camera preview (not scanning)
     */
    function startCamera(onDetect) {
        return new Promise((resolve, reject) => {
            if (isCameraActive) {
                resolve();
                return;
            }

            onDetectCallback = onDetect;

            const hasNativeAPI = 'BarcodeDetector' in window;
            const hasZXing = typeof ZXing !== 'undefined';

            if (!hasNativeAPI && !hasZXing) {
                reject(new Error('Scanner library not loaded and native API not supported. Please use Chrome/Edge or refresh.'));
                return;
            }

            // Show which engine handles the scanning
            if (hasNativeAPI) {
                console.log('🚀 Using Native BarcodeDetector API');
            } else {
                console.log('Using ZXing Library');
                // Initialize the code reader only if we might need it
                initCodeReader();
            }

            // Create video element if it doesn't exist
            const viewport = document.getElementById('scanner-viewport');
            viewport.innerHTML = '';

            videoElement = document.createElement('video');
            videoElement.setAttribute('autoplay', '');
            videoElement.setAttribute('playsinline', '');
            videoElement.setAttribute('muted', '');
            videoElement.style.width = '100%';
            videoElement.style.height = '100%';
            videoElement.style.objectFit = 'cover';
            videoElement.style.borderRadius = '16px';
            viewport.appendChild(videoElement);

            // Create bounding box overlay
            const boundingBox = document.createElement('div');
            boundingBox.className = 'scanner-bounding-box';
            boundingBox.innerHTML = `
                <div class="corner top-left"></div>
                <div class="corner top-right"></div>
                <div class="corner bottom-left"></div>
                <div class="corner bottom-right"></div>
                <span class="scan-hint">Place barcode here</span>
            `;
            viewport.appendChild(boundingBox);

            // Create hidden canvas for capturing snapshots
            canvasElement = document.createElement('canvas');
            canvasElement.style.display = 'none';
            viewport.appendChild(canvasElement);

            // Request camera access
            navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            }).then(stream => {
                videoStream = stream;
                videoElement.srcObject = stream;
                videoElement.play();
                isCameraActive = true;

                // Update button states
                document.getElementById('start-scanner-btn').style.display = 'none';
                document.getElementById('capture-btn').style.display = 'inline-flex';
                document.getElementById('stop-scanner-btn').style.display = 'inline-flex';

                resolve();
            }).catch(err => {
                // Try front camera as fallback
                navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'user',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                }).then(stream => {
                    videoStream = stream;
                    videoElement.srcObject = stream;
                    videoElement.play();
                    isCameraActive = true;

                    // Update button states
                    document.getElementById('start-scanner-btn').style.display = 'none';
                    document.getElementById('capture-btn').style.display = 'inline-flex';
                    document.getElementById('stop-scanner-btn').style.display = 'inline-flex';

                    resolve();
                }).catch(err2 => {
                    reject(new Error('Could not access camera. Please check permissions.'));
                });
            });
        });
    }

    /**
     * Capture a snapshot and scan for barcodes
     */
    function captureAndScan() {
        return new Promise((resolve, reject) => {
            if (!isCameraActive || !videoElement || !canvasElement) {
                reject(new Error('Camera is not active'));
                return;
            }

            // Set canvas dimensions to match video
            const videoWidth = videoElement.videoWidth;
            const videoHeight = videoElement.videoHeight;
            canvasElement.width = videoWidth;
            canvasElement.height = videoHeight;

            // Draw current video frame to canvas
            const ctx = canvasElement.getContext('2d');
            ctx.drawImage(videoElement, 0, 0, videoWidth, videoHeight);

            // 1. Try Native BarcodeDetector API first (Chrome/Edge/Android)
            if ('BarcodeDetector' in window) {
                const formats = [
                    'qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e',
                    'code_128', 'code_39', 'code_93', 'codabar', 'itf'
                ];

                try {
                    const detector = new BarcodeDetector({ formats: formats });
                    detector.detect(canvasElement)
                        .then(barcodes => {
                            if (barcodes.length > 0) {
                                // Success with native detector
                                const decodedText = barcodes[0].rawValue;
                                console.log('✅ Detected (Native):', decodedText);
                                onScanSuccess(decodedText);
                                resolve(decodedText);
                            } else {
                                // No barcode found by native detector -> Try ZXing fallback
                                console.log('Native detector found nothing, trying ZXing...');
                                scanWithZXing(resolve, reject);
                            }
                        })
                        .catch(err => {
                            console.error('Native detector error:', err);
                            scanWithZXing(resolve, reject);
                        });
                    return;
                } catch (e) {
                    console.error('BarcodeDetector creation failed:', e);
                    // Fall through to ZXing
                }
            }

            // 2. Fallback to ZXing
            scanWithZXing(resolve, reject);
        });
    }

    /**
     * Helper: Scan using ZXing library
     */
    function scanWithZXing(resolve, reject) {
        try {
            // Method 1: Decode from canvas context
            const luminanceSource = new ZXing.HTMLCanvasElementLuminanceSource(canvasElement);
            const binaryBitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminanceSource));

            const reader = new ZXing.MultiFormatReader();
            const hints = new Map();
            hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
            reader.setHints(hints);

            const result = reader.decode(binaryBitmap);
            const decodedText = result.getText();

            console.log('✅ Detected (ZXing 1):', decodedText);
            onScanSuccess(decodedText);
            resolve(decodedText);
        } catch (err) {
            // Method 2: Decode from image element (sometimes robust for different images)
            const imageData = canvasElement.toDataURL('image/png');
            const img = new Image();
            img.onload = function () {
                try {
                    if (!codeReader) initCodeReader();
                    codeReader.decodeFromImage(img)
                        .then(result => {
                            const decodedText = result.getText();
                            console.log('✅ Detected (ZXing 2):', decodedText);
                            onScanSuccess(decodedText);
                            resolve(decodedText);
                        })
                        .catch(err2 => {
                            reject(new Error('No barcode detected. Try moving closer.'));
                        });
                } catch (e) {
                    reject(new Error('No barcode detected. Try moving closer.'));
                }
            };
            img.src = imageData;
        }
    }

    /**
     * Helper: Handle successful scan
     */
    function onScanSuccess(decodedText) {
        // Vibrate on success
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }

        // Stop camera
        stopCamera();

        // Call callback
        if (onDetectCallback) {
            onDetectCallback(decodedText);
        }
    }

    /**
     * Stop the camera
     */
    function stopCamera() {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoStream = null;
        }

        if (videoElement) {
            videoElement.srcObject = null;
        }

        isCameraActive = false;
        onDetectCallback = null;

        // Update button states
        document.getElementById('start-scanner-btn').style.display = 'inline-flex';
        document.getElementById('capture-btn').style.display = 'none';
        document.getElementById('stop-scanner-btn').style.display = 'none';

        // Clear the viewport
        const viewport = document.getElementById('scanner-viewport');
        viewport.innerHTML = '';
    }

    function isActive() {
        return isCameraActive;
    }

    function isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    // Public API
    return {
        start: startCamera,
        stop: stopCamera,
        capture: captureAndScan,
        isActive,
        isSupported
    };
})();

window.Scanner = Scanner;
