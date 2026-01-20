/**
 * Scanner Module - Barcode and QR Code Scanning
 * 
 * Uses html5-qrcode library for QR codes and barcodes.
 */

const Scanner = (function () {
    let html5QrCode = null;
    let isRunning = false;
    let onDetectCallback = null;

    /**
     * Initialize and start the scanner
     */
    function start(onDetect) {
        return new Promise((resolve, reject) => {
            if (isRunning) {
                resolve();
                return;
            }

            onDetectCallback = onDetect;

            // Check if Html5Qrcode is available
            if (typeof Html5Qrcode === 'undefined') {
                reject(new Error('Scanner library not loaded. Please refresh the page.'));
                return;
            }

            // Create scanner instance
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
                ]
            });

            // Configuration
            const config = {
                fps: 10,
                qrbox: 250,
                disableFlip: false
            };

            // Start scanning
            html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText, decodedResult) => {
                    handleDetection(decodedText, decodedResult);
                },
                (errorMessage) => { }
            ).then(() => {
                isRunning = true;
                document.getElementById('start-scanner-btn').style.display = 'none';
                document.getElementById('stop-scanner-btn').style.display = 'inline-flex';
                resolve();
            }).catch(err => {
                // Try front camera
                html5QrCode.start(
                    { facingMode: "user" },
                    config,
                    (decodedText, decodedResult) => {
                        handleDetection(decodedText, decodedResult);
                    },
                    (errorMessage) => { }
                ).then(() => {
                    isRunning = true;
                    document.getElementById('start-scanner-btn').style.display = 'none';
                    document.getElementById('stop-scanner-btn').style.display = 'inline-flex';
                    resolve();
                }).catch(err2 => {
                    reject(new Error('Could not access camera. Please check permissions.'));
                });
            });
        });
    }

    /**
     * Handle code detection
     */
    function handleDetection(decodedText, decodedResult) {
        if (!decodedText) return;

        console.log('✅ Detected:', decodedText);

        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }

        stop();

        if (onDetectCallback) {
            onDetectCallback(decodedText);
        }
    }

    /**
     * Stop the scanner
     */
    function stop() {
        if (!isRunning || !html5QrCode) return;

        html5QrCode.stop().then(() => {
            isRunning = false;
            onDetectCallback = null;
            document.getElementById('start-scanner-btn').style.display = 'inline-flex';
            document.getElementById('stop-scanner-btn').style.display = 'none';
            html5QrCode.clear();
        }).catch(err => {
            isRunning = false;
            document.getElementById('start-scanner-btn').style.display = 'inline-flex';
            document.getElementById('stop-scanner-btn').style.display = 'none';
        });
    }

    function isActive() {
        return isRunning;
    }

    function isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    return {
        start,
        stop,
        isActive,
        isSupported
    };
})();

window.Scanner = Scanner;
