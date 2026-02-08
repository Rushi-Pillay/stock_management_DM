import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useInventory } from '../contexts/InventoryContext';
import { useModal } from '../contexts/ModalContext';
import { useToast } from '../contexts/ToastContext';
import { Camera, StopCircle } from 'lucide-react';

export default function ScanView() {
    const { items } = useInventory();
    const { openDetailModal, openItemModal } = useModal();
    const { showToast } = useToast();

    const [isScanning, setIsScanning] = useState(false);
    const scannerRef = useRef(null);
    const [manualCode, setManualCode] = useState('');

    const handleScanSuccess = (decodedText) => {
        // Stop scanning on success
        stopScanner();
        handleBarcode(decodedText);
    };

    const handleBarcode = (code) => {
        showToast(`Looking up: ${code}`, 'info');

        // 1. Exact match
        const exactMatch = items.find(item => item.barcode === code);
        if (exactMatch) {
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
            openDetailModal(searchMatches[0]);
        } else if (searchMatches.length > 1) {
            // If multiple matches, we might want to show a list or just pick first
            // For now, let's just show details of first, or maybe alert user
            showToast(`Found ${searchMatches.length} matches. Showing first.`, 'success');
            openDetailModal(searchMatches[0]);
        } else {
            showToast('Item not found', 'warning');
            // Pre-fill modal with scanned code
            openItemModal({ barcode: code });
        }
    };

    const startScanner = async () => {
        try {
            const scanner = new Html5Qrcode("scanner-viewport");
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                handleScanSuccess,
                (errorMessage) => {
                    // ignore errors
                }
            );

            setIsScanning(true);
            showToast('Scanner active', 'success');
        } catch (err) {
            console.error('Scanner error:', err);
            showToast('Camera access failed', 'error');
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current && isScanning) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
                setIsScanning(false);
            } catch (err) {
                console.error('Stop scanner error:', err);
            }
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current && isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, [isScanning]);

    const handleManualLookup = () => {
        if (manualCode) {
            handleBarcode(manualCode);
            setManualCode('');
        }
    };

    return (
        <section className="view active">
            <div className="scanner-container">
                <p className="scanner-hint-text">Point camera at barcode or QR code</p>
                <div id="scanner-viewport" className="scanner-viewport"></div>

                {!isScanning ? (
                    <button className="btn btn-primary btn-large" onClick={startScanner}>
                        <span className="btn-icon"><Camera /></span>
                        Start Scanner
                    </button>
                ) : (
                    <button className="btn btn-secondary btn-large" onClick={stopScanner}>
                        <span className="btn-icon"><StopCircle /></span>
                        Stop Scanner
                    </button>
                )}
            </div>

            <div className="manual-entry">
                <p>Or enter barcode manually:</p>
                <div className="input-group">
                    <input
                        type="text"
                        placeholder="Enter barcode number"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleManualLookup()}
                    />
                    <button className="btn btn-accent" onClick={handleManualLookup}>Look Up</button>
                </div>
            </div>
        </section>
    );
}
