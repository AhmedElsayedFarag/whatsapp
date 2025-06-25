const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const express = require('express');
const app = express();
app.use(express.json());

let qrImageData = null; // Store QR code image temporarily

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});

// Generate QR code and store it as image data
client.on('qr', async (qr) => {
    console.log('QR received, generating browser image...');
    qrImageData = await qrcode.toDataURL(qr); // Generate base64 image
});

// When WhatsApp is ready
client.on('ready', () => {
    console.log('WhatsApp is ready!');
    qrImageData = null; // Clear QR since it's no longer needed
});

client.initialize();

// Show QR code as image in browser
app.get('/qr', (req, res) => {
    if (!qrImageData) {
        return res.send('QR code not available or already scanned.');
    }

    res.send(`
        <html>
            <body>
                <h2>Scan QR Code with WhatsApp</h2>
                <img src="${qrImageData}" />
            </body>
        </html>
    `);
});

// Endpoint to send message
app.post('/send-message', async (req, res) => {
    const { number, message } = req.body;

    try {
        await client.sendMessage(`${number}@c.us`, message);
        res.json({ status: 'Message sent!' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to send message', details: e.message });
    }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
