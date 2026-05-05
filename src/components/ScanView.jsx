import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useInventory } from '../contexts/InventoryContext';
import { useModal } from '../contexts/ModalContext';
import { useToast } from '../contexts/ToastContext';
import { Camera, StopCircle } from 'lucide-react';
import ItemCard from './ItemCard';

export default function ScanView() {
    const { items } = useInventory();
    const { openDetailModal, openItemModal } = useModal();
    const { showToast } = useToast();

    const [isScanning, setIsScanning] = useState(false);
    const scannerRef = useRef(null);
    const [manualCode, setManualCode] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const inputRef = useRef(null);

    // Focus on mount and when view becomes active
    useEffect(() => {
        const timer = setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    // Global Key Listener for Barcode Scanners (handles input when not focused)
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            // Ignore if focus is already on an input (let native behavior work)
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
                return;
            }

            // Determine action
            if (e.key === 'Enter') {
                if (inputRef.current) {
                    inputRef.current.focus();
                }
                // If we have built up a code in state, submit it
                if (manualCode) {
                    handleManualLookup();
                }
            } else if (e.key === 'Backspace') {
                setManualCode(prev => prev.slice(0, -1));
            } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
                setManualCode(prev => prev + e.key);

                // Also ensure input gets focus so user sees what's happening
                if (inputRef.current) {
                    inputRef.current.focus();
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [manualCode]);

    const handleScanSuccess = (decodedText) => {
        // Play a beep or success feedback if possible (optional)

        // Update input
        setManualCode(decodedText);

        // Stop scanning automatically to allow user to verify/edit or just submit
        stopScanner();

        showToast('Code scanned successfully', 'success');
    };

    const handleBarcode = (code) => {
        showToast(`Looking up: ${code} `, 'info');

        // 1. Exact match
        const exactMatch = items.find(item => item.barcode === code);
        if (exactMatch) {
            setSearchResults([]);
            openDetailModal(exactMatch);
            return;
        }

        // 2. Search match (description/stock number)
        const searchTerm = code.toLowerCase();
        const searchMatches = items.filter(item =>
            item.description.toLowerCase().includes(searchTerm) ||
            item.stockNumber.toLowerCase().includes(searchTerm)
        );

        if (searchMatches.length === 1) {
            setSearchResults([]);
            openDetailModal(searchMatches[0]);
        } else if (searchMatches.length > 1) {
            showToast(`Found ${searchMatches.length} matches. Please select one.`, 'success');
            setSearchResults(searchMatches);
        } else {
            setSearchResults([]);
            showToast('Item not found', 'warning');
            // Pre-fill modal with scanned code
            openItemModal({ barcode: code });
        }
    };

    const startScanner = async () => {
        try {
            // Debug checks
            if (!window.isSecureContext) {
                showToast('Camera requires a secure context (HTTPS or localhost)', 'error');
                return;
            }
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                showToast('Camera API not present. Are you on HTTPS?', 'error');
                return;
            }

            // Ensure element exists
            if (!document.getElementById("scanner-viewport")) {
                console.error("Scanner element not found");
                showToast('Scanner display element missing', 'error');
                return;
            }

            // Optimize for QR Code only
            const scanner = new Html5Qrcode("scanner-viewport");
            scannerRef.current = scanner;

            // Optional: Request permission explicitly first to trigger the browser prompt immediately
            try {
                await navigator.mediaDevices.getUserMedia({ video: true });
            } catch (permErr) {
                showToast(`Permission denied: ${permErr.message} `, 'error');
                return;
            }

            const config = {
                fps: 15, // Increased FPS for faster feel
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
            };

            await scanner.start(
                { facingMode: "environment" },
                config,
                handleScanSuccess,
                (errorMessage) => {
                    // minor scanning errors, ignore
                }
            );

            setIsScanning(true);
            showToast('Scanner active (QR Only)', 'success');
        } catch (err) {
            console.error('Scanner error:', err);
            showToast(`Start failed: ${err.message || err} `, 'error');
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
                setIsScanning(false);
            } catch (err) {
                console.error('Stop scanner error:', err);
                setIsScanning(false);
            }
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, []);

    const handleManualLookup = () => {
        if (manualCode) {
            handleBarcode(manualCode);
            setManualCode('');
            // Refocus for next scan
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                }
            }, 0);
        }
    };

    return (
        <section className="view active">
            <div className="scanner-container">
                <div id="scanner-viewport" className="scanner-viewport" style={{ width: '100%', maxWidth: '500px', margin: '0 auto', display: isScanning ? 'block' : 'none' }}></div>

                {!isScanning && (
                    <div className="scanner-placeholder" style={{ textAlign: 'center', padding: '2rem', border: '2px dashed #ccc', borderRadius: '8px', marginBottom: '1rem' }}>
                        <Camera size={48} color="#ccc" />
                        <p>Camera is off</p>
                    </div>
                )}

                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    {!isScanning ? (
                        <button className="btn btn-primary" onClick={startScanner}>
                            <Camera size={20} style={{ marginRight: '8px' }} />
                            Start Camera
                        </button>
                    ) : (
                        <button className="btn btn-danger" onClick={stopScanner}>
                            <StopCircle size={20} style={{ marginRight: '8px' }} />
                            Stop Camera
                        </button>
                    )}
                </div>
            </div>

            <div className="manual-entry" style={{ marginTop: '2rem' }}>
                <p style={{ fontSize: '1.2rem', marginBottom: '1rem', fontWeight: 'bold' }}>Enter barcode / SKU:</p>
                <div className="input-group">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Enter barcode number"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleManualLookup()}
                    />
                    <button className="btn btn-accent" onClick={handleManualLookup}>Look Up</button>
                </div>

                {searchResults.length > 0 && (
                    <div className="results-container" style={{ marginTop: '2rem' }}>
                        <p style={{ marginBottom: '1rem', fontWeight: 'bold' }}>Multiple matches found. Select an item:</p>
                        {searchResults.map(item => (
                            <ItemCard
                                key={item.id}
                                item={item}
                                onClick={openDetailModal}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
