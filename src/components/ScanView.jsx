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

    // const [isScanning, setIsScanning] = useState(false);
    // const scannerRef = useRef(null);
    const [manualCode, setManualCode] = useState('');
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
                // We can't easily rely on state in the closure without re-binding listener constantly
                // But we can focus the input and let the form submit logic handle it?
                // Actually, if we are building the code in state, we should submit it.
                // However, standard scanners just type characters and hit Enter.
                // If we aren't focused, we should capture the characters.
                // Let's rely on the state updater pattern or a ref for the current code being built invisibly?
                // Simpler: Just focus the input if they start typing.
                if (inputRef.current) {
                    inputRef.current.focus();
                    // Note: The Enter key might trigger the submit if we focus fast enough? 
                    // No. But subsequent keys will go to input.
                }
                // If we have built up a code in state, submit it
                if (manualCode) {
                    handleManualLookup();
                }
            } else if (e.key === 'Backspace') {
                setManualCode(prev => prev.slice(0, -1));
            } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
                // Capture alphanumeric chars
                // Note: Standard scanners might send Shift for uppercase, so !e.shiftKey might be too aggressive if barcodes have uppercase.
                // Let's allow Shift but check char length.
                setManualCode(prev => prev + e.key);

                // Also ensure input gets focus so user sees what's happening
                if (inputRef.current) {
                    inputRef.current.focus();
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [manualCode]); // Re-bind when code changes so 'Enter' sees latest 'manualCode'

    // const handleScanSuccess = (decodedText) => {
    //     // Stop scanning on success
    //     stopScanner();
    //     handleBarcode(decodedText);
    // };

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

    // Cleanup on unmount - safe to remove if not scanning
    // useEffect(() => {
    //     return () => {
    //         if (scannerRef.current && isScanning) {
    //             scannerRef.current.stop().catch(console.error);
    //         }
    //     };
    // }, [isScanning]);

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
            <div className="scanner-container" style={{ display: 'none' }}>
                <p className="scanner-hint-text">Scanner disabled</p>
                {/* <div id="scanner-viewport" className="scanner-viewport"></div> */}
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
            </div>
        </section>
    );
}
