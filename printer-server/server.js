import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import ipp from 'ipp';
import { Buffer } from 'buffer';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

app.post('/print', (req, res) => {
    const { ip, image } = req.body;

    if (!ip || !image) {
        return res.status(400).json({ error: 'Missing IP or image data' });
    }

    // "image" comes as data:image/png;base64,....
    // Strip the prefix
    const base64Data = image.replace(/^data:image\/png;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const printerUrl = `http://${ip}:631/ipp/print`;

    const msg = {
        "operation-attributes-tag": {
            "requesting-user-name": "StockManager",
            "job-name": "Label Print Job",
            "document-format": "image/png"
        },
        data: imageBuffer
    };

    const printer = ipp.Printer(printerUrl);

    printer.execute("Print-Job", msg, (err, response) => {
        if (err) {
            console.error('IPP Error:', err);
            return res.status(500).json({ error: 'Print failed', details: err.toString() });
        }

        console.log('Print job sent:', response);

        if (response.statusCode === 'successful-ok') {
            res.json({ success: true, message: 'Print job sent successfully' });
        } else {
            res.status(500).json({ error: 'Printer reported error', details: response });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Printer Bridge Server running on http://localhost:${PORT}`);
});
