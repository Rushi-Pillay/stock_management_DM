/**
 * Scanner Module - Snapshot-based Barcode Scanning
 * 
 * Uses html5-qrcode library to scan barcodes from captured images.
 * Takes a snapshot of the camera feed and processes it for barcodes.
 */

const Scanner = (function () {
    let html5QrCode = null;
    let videoStream = null;
    let videoElement = null;
    let canvasElement = null;
    let onDetectCallback = null;
    let isCameraActive = false;

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

            // Check if Html5Qrcode is available
            if (typeof Html5Qrcode === 'undefined') {
                reject(new Error('Scanner library not loaded. Please refresh the page.'));
                return;
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

            // Create hidden canvas for capturing snapshots
            canvasElement = document.createElement('canvas');
            canvasElement.style.display = 'none';
            viewport.appendChild(canvasElement);

            // Create Html5Qrcode instance for decoding
            html5QrCode = new Html5Qrcode("scanner-viewport", {
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.QR_CODE,
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.CODE_93,
                    Html5QrcodeSupportedFormats.CODABAR,
                    Html5QrcodeSupportedFormats.ITF
                ],
                verbose: false
            });

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

            // Get image data as base64
            const imageData = canvasElement.toDataURL('image/jpeg', 0.9);

            // Scan the captured image
            html5QrCode.scanFile(dataURItoFile(imageData, 'capture.jpg'), true)
                .then(decodedText => {
                    console.log('✅ Detected:', decodedText);

                    // Vibrate on success
                    if (navigator.vibrate) {
                        navigator.vibrate([100, 50, 100]);
                    }

                    // Stop camera after successful scan
                    stopCamera();

                    // Call the callback
                    if (onDetectCallback) {
                        onDetectCallback(decodedText);
                    }

                    resolve(decodedText);
                })
                .catch(err => {
                    // No barcode found in the image
                    reject(new Error('No barcode detected. Please try again.'));
                });
        });
    }

    /**
     * Convert data URI to File object
     */
    function dataURItoFile(dataURI, filename) {
        const arr = dataURI.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
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

    // Public API - keeping backward compatibility
    return {
        start: startCamera,  // Renamed internally but keeping external name
        stop: stopCamera,
        capture: captureAndScan,
        isActive,
        isSupported
    };
})();

window.Scanner = Scanner;
