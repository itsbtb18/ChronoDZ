const express = require('express');
const dotenv = require('dotenv');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const DJANGO_API_KEY = process.env.DJANGO_API_KEY || '';

app.use(express.json({ limit: '1mb' }));

function getGreetingByAlgeriaTime(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Algiers',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const timeParts = formatter.formatToParts(date);
  const hourPart = timeParts.find((part) => part.type === 'hour');
  const hour = Number(hourPart?.value || '0');

  if (hour >= 5 && hour < 18) {
    return 'Bonjour';
  }

  return 'Bonsoir';
}

function randomDelayMs() {
  const min = 5000;
  const max = 12000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeAlgerianPhone(phone) {
  if (!phone) {
    return null;
  }

  const digits = String(phone).replace(/\D/g, '');

  if (digits.startsWith('213')) {
    return `${digits}@c.us`;
  }

  if (digits.startsWith('0')) {
    return `213${digits.slice(1)}@c.us`;
  }

  if (digits.length === 9 && (digits.startsWith('5') || digits.startsWith('6') || digits.startsWith('7') || digits.startsWith('2'))) {
    return `213${digits}@c.us`;
  }

  if (digits.length === 12 && digits.startsWith('213')) {
    return `${digits}@c.us`;
  }

  return null;
}

function authGuard(req, res, next) {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';

  if (!DJANGO_API_KEY || token !== DJANGO_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

async function sendTextWithDelay(client, chatId, message) {
  await sleep(randomDelayMs());
  return client.sendMessage(chatId, message);
}

async function sendQrWithDelay(client, chatId, payload, caption) {
  const dataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    scale: 8,
  });

  await sleep(randomDelayMs());
  return client.sendMessage(chatId, dataUrl, { caption });
}

function buildWelcomeMessage(clientName, phone, secretCode, greeting) {
  return `${greeting} ${clientName}, votre compte a été créé avec succès avec le numéro ${phone} et le code secret ${secretCode} (Ne partagez pas cela avec quelqu'un).`;
}

function buildBookingMessage(clientName, establishmentName, date, time, totalPrice, greeting) {
  return `${greeting} ${clientName}, votre rendez-vous à ${establishmentName} a été confirmé pour la date du ${date} à ${time}. Veuillez vous présenter dans ce créneau et payer le montant de ${totalPrice} DA.`;
}

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'laverie-de-la-residence' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

client.on('qr', (qr) => {
  console.log('Scan the QR code below to connect WhatsApp:');
  qrcodeTerminal.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('WhatsApp client is ready.');
});

client.on('auth_failure', (message) => {
  console.error('WhatsApp authentication failed:', message);
});

client.on('disconnected', (reason) => {
  console.error('WhatsApp client disconnected:', reason);
});

client.initialize();

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/v1/send-notification', authGuard, async (req, res) => {
  try {
    if (!client.info) {
      return res.status(503).json({ error: 'WhatsApp client not ready' });
    }

    const {
      type,
      phone,
      clientName,
      secretCode,
      establishmentName,
      date,
      time,
      totalPrice,
      bookingId,
    } = req.body || {};

    if (!type || !phone || !clientName) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['type', 'phone', 'clientName'],
      });
    }

    const chatId = normalizeAlgerianPhone(phone);
    if (!chatId) {
      return res.status(400).json({ error: 'Invalid Algerian phone number' });
    }

    const greeting = getGreetingByAlgeriaTime(new Date());

    if (type === 'WELCOME_ACCOUNT') {
      if (!secretCode) {
        return res.status(400).json({ error: 'secretCode is required for WELCOME_ACCOUNT' });
      }

      const message = buildWelcomeMessage(clientName, phone, secretCode, greeting);
      await sendTextWithDelay(client, chatId, message);
      await sendQrWithDelay(client, chatId, `LOGIN:${phone}:${secretCode}`, 'QR Login');

      return res.json({ success: true });
    }

    if (type === 'BOOKING_CONFIRMATION') {
      if (!establishmentName || !date || !time || !totalPrice || !bookingId) {
        return res.status(400).json({
          error: 'Missing required fields for BOOKING_CONFIRMATION',
          required: ['establishmentName', 'date', 'time', 'totalPrice', 'bookingId'],
        });
      }

      const message = buildBookingMessage(clientName, establishmentName, date, time, totalPrice, greeting);
      await sendTextWithDelay(client, chatId, message);
      await sendQrWithDelay(client, chatId, `VALIDATE_BOOKING:${bookingId}`, 'QR Validation');

      return res.json({ success: true });
    }

    return res.status(400).json({ error: 'Unsupported notification type' });
  } catch (error) {
    console.error('Notification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`WhatsApp notification server running on port ${PORT}`);
});