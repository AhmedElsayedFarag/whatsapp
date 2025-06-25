const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const express = require('express');
const app = express();

app.use(express.json());

let qrImageData = null;
let clientReady = false;

// WhatsApp client configuration
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth' // Save session locally
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process',
            '--no-zygote'
        ]
    }
});

// Generate QR and store image
client.on('qr', async (qr) => {
    console.log('📱 QR received. Generating image...');
    qrImageData = await qrcode.toDataURL(qr);
    clientReady = false;
});

// WhatsApp is connected
client.on('ready', () => {
    console.log('✅ WhatsApp is ready!');
    qrImageData = null;
    clientReady = true;
});

// Auth failure
client.on('auth_failure', (msg) => {
    console.error('❌ AUTH FAILED:', msg);
    clientReady = false;
});

// Disconnected
client.on('disconnected', (reason) => {
    console.warn('⚠️ WhatsApp client disconnected:', reason);
    clientReady = false;
});

// Initialize client
client.initialize();

// Show QR code in browser
app.get('/qr', (req, res) => {
    if (clientReady) {
        return res.send('✅ WhatsApp is already connected.');
    }

    if (!qrImageData) {
        return res.send('⏳ QR code not yet generated. Refresh shortly.');
    }

    res.send(`
        <html>
            <head><title>WhatsApp QR</title></head>
            <body style="text-align:center; font-family:sans-serif; margin-top:50px;">
                <h2>Scan this QR Code with WhatsApp</h2>
                <img src="${qrImageData}" style="width:300px;" />
                <p>Leave this page open until connected.</p>
            </body>
        </html>
    `);
});

// Send message endpoint
app.post('/send-message', async (req, res) => {
    const { number, message } = req.body;

    if (!clientReady) {
        return res.status(503).json({ error: '❌ WhatsApp is not connected yet' });
    }

    if (!number || !message) {
        return res.status(400).json({ error: 'Missing number or message' });
    }

    try {
        await client.sendMessage(`${number}@c.us`, message);
        res.json({ status: '✅ Message sent successfully' });
    } catch (e) {
        console.error('❌ Send failed:', e);
        res.status(500).json({ error: '❌ Failed to send message', details: e.message });
    }
});

// Use dynamic port (important for Railway)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
