/**
 * Scanner Module - ZXing Barcode and QR Code Scanning
 * 
 * Uses ZXing library for superior barcode detection.
 * Supports: QR, EAN-13, EAN-8, UPC-A, UPC-E, Code-128, Code-39, Code-93, ITF, Codabar
 */

const Scanner = (function () {
    let videoElement = null;
    let canvasElement = null;
    let canvasContext = null;
    let stream = null;
    let isRunning = false;
    let onDetectCallback = null;
    let animationFrameId = null;
    let codeReader = null;
    let lastDetectedCode = null;
    let lastDetectionTime = 0;
    const DETECTION_COOLDOWN = 2000; // 2 seconds between same code detections

    /**
     * Initialize and start the scanner
     */
    function start(onDetect) {
        return new Promise(async (resolve, reject) => {
            if (isRunning) {
                resolve();
                return;
            }

            onDetectCallback = onDetect;

            try {
                // Check if ZXing is loaded
                if (typeof ZXing === 'undefined') {
                    reject(new Error('ZXing library not loaded. Please refresh the page.'));
                    return;
                }

                // Initialize ZXing code reader
                codeReader = new ZXing.BrowserMultiFormatReader();

                // Set up hints for better detection
                const hints = new Map();
                hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
                    ZXing.BarcodeFormat.QR_CODE,
                    ZXing.BarcodeFormat.EAN_13,
                    ZXing.BarcodeFormat.EAN_8,
                    ZXing.BarcodeFormat.UPC_A,
                    ZXing.BarcodeFormat.UPC_E,
                    ZXing.BarcodeFormat.CODE_128,
                    ZXing.BarcodeFormat.CODE_39,
                    ZXing.BarcodeFormat.CODE_93,
                    ZXing.BarcodeFormat.ITF,
                    ZXing.BarcodeFormat.CODABAR
                ]);
                hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
                codeReader.hints = hints;

                // Get available cameras
                const devices = await codeReader.listVideoInputDevices();

                if (devices.length === 0) {
                    reject(new Error('No camera found on this device.'));
                    return;
                }

                // Prefer back camera
                let selectedDeviceId = devices[0].deviceId;
                for (const device of devices) {
                    if (device.label.toLowerCase().includes('back') ||
                        device.label.toLowerCase().includes('rear') ||
                        device.label.toLowerCase().includes('environment')) {
                        selectedDeviceId = device.deviceId;
                        break;
                    }
                }

                // Start decoding from video device
                const viewportElement = document.getElementById('scanner-viewport');

                // Create video element if it doesn't exist
                let video = viewportElement.querySelector('video');
                if (!video) {
                    video = document.createElement('video');
                    video.id = 'scanner-video';
                    video.style.width = '100%';
                    video.style.height = '100%';
                    video.style.objectFit = 'cover';
                    video.style.borderRadius = 'var(--radius-lg)';
                    video.setAttribute('playsinline', 'true');
                    viewportElement.appendChild(video);
                }
                videoElement = video;

                // Start continuous decoding
                await codeReader.decodeFromVideoDevice(
                    selectedDeviceId,
                    videoElement,
                    (result, error) => {
                        if (result) {
                            handleDetection(result.getText(), result);
                        }
                        // Ignore errors - they happen when no code is in view
                    }
                );

                isRunning = true;
                document.getElementById('start-scanner-btn').style.display = 'none';
                document.getElementById('stop-scanner-btn').style.display = 'inline-flex';
                resolve();

            } catch (err) {
                console.error('Scanner start error:', err);
                reject(new Error('Could not access camera. Please check permissions.'));
            }
        });
    }

    /**
     * Handle code detection with cooldown to prevent duplicates
     */
    function handleDetection(decodedText, result) {
        if (!decodedText) return;

        const now = Date.now();

        // Prevent duplicate detections within cooldown period
        if (decodedText === lastDetectedCode && (now - lastDetectionTime) < DETECTION_COOLDOWN) {
            return;
        }

        lastDetectedCode = decodedText;
        lastDetectionTime = now;

        console.log('✅ ZXing Detected:', decodedText, result?.getBarcodeFormat?.());

        // Vibrate for feedback
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }

        // Stop scanner after successful detection
        stop();

        // Call the callback
        if (onDetectCallback) {
            onDetectCallback(decodedText);
        }
    }

    /**
     * Stop the scanner
     */
    function stop() {
        if (!isRunning) return;

        try {
            if (codeReader) {
                codeReader.reset();
            }

            // Clean up video element
            const viewportElement = document.getElementById('scanner-viewport');
            const video = viewportElement?.querySelector('video');
            if (video) {
                video.srcObject = null;
            }

        } catch (err) {
            console.error('Error stopping scanner:', err);
        }

        isRunning = false;
        onDetectCallback = null;
        lastDetectedCode = null;

        document.getElementById('start-scanner-btn').style.display = 'inline-flex';
        document.getElementById('stop-scanner-btn').style.display = 'none';
    }

    /**
     * Check if scanner is currently active
     */
    function isActive() {
        return isRunning;
    }

    /**
     * Check if scanning is supported on this device
     */
    function isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    /**
     * Get list of available cameras
     */
    async function getCameras() {
        if (!codeReader) {
            codeReader = new ZXing.BrowserMultiFormatReader();
        }
        return await codeReader.listVideoInputDevices();
    }

    // Public API
    return {
        start,
        stop,
        isActive,
        isSupported,
        getCameras
    };
})();

// Make Scanner available globally
window.Scanner = Scanner;
