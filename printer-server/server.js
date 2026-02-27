import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import sharp from 'sharp';
import net from 'net';
import { Buffer } from 'buffer';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// ─────────────────────────────────────────────────────────────
// Brother QL-810W Label Size Definitions (300dpi)
// Each entry: printable width in dots, height in dots (0 = continuous),
// media type byte, width mm, length mm (0 = continuous)
// ─────────────────────────────────────────────────────────────
const LABEL_SIZES = {
    // Continuous rolls
    '62_continuous': { widthDots: 720, heightDots: 0, mediaType: 0x0A, widthMm: 62, lengthMm: 0, name: '62mm Continuous (DK-22205)' },
    '29_continuous': { widthDots: 306, heightDots: 0, mediaType: 0x0A, widthMm: 29, lengthMm: 0, name: '29mm Continuous (DK-22210)' },
    '12_continuous': { widthDots: 142, heightDots: 0, mediaType: 0x0A, widthMm: 12, lengthMm: 0, name: '12mm Continuous (DK-22214)' },

    // Die-cut labels
    '62x100': { widthDots: 720, heightDots: 1164, mediaType: 0x0B, widthMm: 62, lengthMm: 100, name: '62×100mm Shipping (DK-11202)' },
    '62x29': { widthDots: 720, heightDots: 341, mediaType: 0x0B, widthMm: 62, lengthMm: 29, name: '62×29mm Address (DK-11209)' },
    '29x90': { widthDots: 306, heightDots: 1050, mediaType: 0x0B, widthMm: 29, lengthMm: 90, name: '29×90mm Standard (DK-11201)' },
    '29x62': { widthDots: 306, heightDots: 720, mediaType: 0x0B, widthMm: 29, lengthMm: 62, name: '29×62mm Small (DK-11209)' },
    '17x54': { widthDots: 200, heightDots: 636, mediaType: 0x0B, widthMm: 17, lengthMm: 54, name: '17×54mm Multi (DK-11204)' },
    '17x87': { widthDots: 200, heightDots: 1012, mediaType: 0x0B, widthMm: 17, lengthMm: 87, name: '17×87mm File (DK-11203)' },
};

// ─────────────────────────────────────────────────────────────
// GET /labels — Return available label sizes (for frontend dropdown)
// ─────────────────────────────────────────────────────────────
app.get('/labels', (_req, res) => {
    const labels = Object.entries(LABEL_SIZES).map(([key, val]) => ({
        id: key,
        name: val.name,
        widthMm: val.widthMm,
        lengthMm: val.lengthMm,
    }));
    res.json(labels);
});

// ─────────────────────────────────────────────────────────────
// POST /print — Print a label via Brother raster protocol
// Body: { ip, image (base64 PNG), labelSize (key from LABEL_SIZES) }
// ─────────────────────────────────────────────────────────────
app.post('/print', async (req, res) => {
    const { ip, image, labelSize } = req.body;

    if (!ip || !image) {
        return res.status(400).json({ error: 'Missing IP or image data' });
    }

    const label = LABEL_SIZES[labelSize] || LABEL_SIZES['62_continuous'];
    console.log(`Printing to ${ip} — label: ${label.name}`);

    try {
        // 1. Decode the base64 PNG image
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // 2. Process with sharp: resize to fit label, convert to 1-bit monochrome
        const { widthDots, heightDots } = label;

        // For continuous labels, auto-determine height from aspect ratio
        let targetWidth = widthDots;
        let targetHeight = heightDots;

        const metadata = await sharp(imageBuffer).metadata();
        const aspectRatio = metadata.height / metadata.width;

        if (targetHeight === 0) {
            // Continuous: scale height proportionally
            targetHeight = Math.round(targetWidth * aspectRatio);
        }

        // Resize image to fit the label, then get raw greyscale buffer
        const processedImage = await sharp(imageBuffer)
            .resize(targetWidth, targetHeight, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .greyscale()
            .toBuffer();

        // Get raw pixel data as greyscale (1 byte per pixel)
        const rawPixels = await sharp(processedImage)
            .raw()
            .toBuffer({ resolveWithObject: true });

        const { data: pixelData, info } = rawPixels;
        const imgWidth = info.width;
        const imgHeight = info.height;

        // 3. Build the Brother raster command buffer
        const rasterData = buildBrotherRasterData(pixelData, imgWidth, imgHeight, label, targetHeight);

        // 4. Send via TCP to printer on port 9100
        await sendToPrinter(ip, rasterData);

        console.log('Print job sent successfully!');
        res.json({ success: true, message: 'Print job sent successfully' });
    } catch (err) {
        console.error('Print error:', err);
        res.status(500).json({ error: 'Print failed', details: err.message });
    }
});

// ─────────────────────────────────────────────────────────────
// Build Brother QL Raster Command Sequence
// Reference: Brother QL-800/810W/820NWB Raster Command Reference
// ─────────────────────────────────────────────────────────────
function buildBrotherRasterData(pixelData, imgWidth, imgHeight, label, actualHeight) {
    const buffers = [];

    // The QL-810W uses 90 bytes per raster line (720 dots max)
    const bytesPerLine = 90;

    // ── 1. Invalidate: send 200 null bytes ──
    buffers.push(Buffer.alloc(200, 0x00));

    // ── 2. Initialize: ESC @ ──
    buffers.push(Buffer.from([0x1B, 0x40]));

    // ── 3. Switch to raster mode: ESC i a {n} ──
    // n=1: raster mode
    buffers.push(Buffer.from([0x1B, 0x69, 0x61, 0x01]));

    // ── 4. Set media & quality: ESC i z {flags} {mediaType} {width} {length_lo} {length_hi} {0} {0} {page} {0} ──
    // flags: bit 6 = quality priority, bit 5 = media type valid, bit 3 = width valid, bit 2 = height valid
    let flags = 0x00;
    flags |= (1 << 6); // quality priority
    flags |= (1 << 5); // media type specified
    flags |= (1 << 3); // width specified

    const lengthLo = actualHeight & 0xFF;
    const lengthHi = (actualHeight >> 8) & 0xFF;

    if (label.heightDots > 0) {
        // Die-cut: specify length
        flags |= (1 << 2); // height specified
    }

    buffers.push(Buffer.from([
        0x1B, 0x69, 0x7A,  // ESC i z
        flags,
        label.mediaType,     // media type
        label.widthMm,       // width in mm
        label.lengthMm,      // length in mm
        lengthLo,            // raster lines low byte
        lengthHi,            // raster lines high byte
        0x00, 0x00,          // page number (starting page = 0)
        0x00                 // 0 = starting page
    ]));

    // ── 5. Set auto-cut: ESC i M {flag} ──
    // flag: bit 6 = auto-cut on
    buffers.push(Buffer.from([0x1B, 0x69, 0x4D, 0x40]));

    // ── 6. Set cut-every: ESC i A {n} ──
    // n=1: cut every 1 label
    buffers.push(Buffer.from([0x1B, 0x69, 0x41, 0x01]));

    // ── 7. Set expanded mode: ESC i K {flags} ──
    // flags = 0x08 for cut at end
    buffers.push(Buffer.from([0x1B, 0x69, 0x4B, 0x08]));

    // ── 8. Set margin (feed amount): ESC i d {lo} {hi} ──
    // Small margin of 35 dots
    buffers.push(Buffer.from([0x1B, 0x69, 0x64, 0x23, 0x00]));

    // ── 9. Set compression mode: M {n} ──
    // n=0: no compression (TIFF is n=2, but uncompressed is simpler)
    buffers.push(Buffer.from([0x4D, 0x00]));

    // ── 10. Send raster data line by line ──
    // Each line: 'g' 0x00 {bytesPerLine} {data...}
    // Pixel data is greyscale (0-255), threshold at 128
    // Brother expects: 1 = white (paper), 0 = black (printed)
    // But in the raster data it's inverted: bit 1 = print (black dot)

    // Calculate left offset to center the image in the 90-byte raster line
    const imgBytesPerLine = Math.ceil(imgWidth / 8);
    const leftPadBytes = Math.floor((bytesPerLine - imgBytesPerLine) / 2);

    for (let y = 0; y < imgHeight; y++) {
        const lineBuffer = Buffer.alloc(bytesPerLine, 0x00);

        for (let x = 0; x < imgWidth; x++) {
            const pixelIndex = y * imgWidth + x;
            const greyValue = pixelData[pixelIndex];

            // Threshold: below 128 = black (print), above = white (no print)
            if (greyValue < 128) {
                const bytePos = leftPadBytes + Math.floor(x / 8);
                const bitPos = 7 - (x % 8);
                if (bytePos < bytesPerLine) {
                    lineBuffer[bytePos] |= (1 << bitPos);
                }
            }
        }

        // Raster line command: 'g' 0x00 {length} {data}
        const lineHeader = Buffer.from([0x67, 0x00, bytesPerLine]);
        buffers.push(Buffer.concat([lineHeader, lineBuffer]));
    }

    // ── 11. Print and feed ──
    // 0x1A = print with feeding
    buffers.push(Buffer.from([0x1A]));

    return Buffer.concat(buffers);
}

// ─────────────────────────────────────────────────────────────
// Send raw data to printer via TCP port 9100
// ─────────────────────────────────────────────────────────────
function sendToPrinter(ip, data) {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        const TIMEOUT = 10000; // 10 seconds

        socket.setTimeout(TIMEOUT);

        socket.connect(9100, ip, () => {
            console.log(`Connected to printer at ${ip}:9100`);
            socket.write(data, () => {
                console.log(`Sent ${data.length} bytes of raster data`);
                // Give the printer a moment to process
                setTimeout(() => {
                    socket.destroy();
                    resolve();
                }, 1000);
            });
        });

        socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('Connection to printer timed out'));
        });

        socket.on('error', (err) => {
            socket.destroy();
            reject(new Error(`Printer connection error: ${err.message}`));
        });
    });
}

app.listen(PORT, () => {
    console.log(`Brother QL-810W Print Server running on http://localhost:${PORT}`);
    console.log('Supported labels:');
    Object.entries(LABEL_SIZES).forEach(([key, val]) => {
        console.log(`  ${key}: ${val.name}`);
    });
});
