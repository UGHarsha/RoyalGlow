import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { sendBookingConfirmationEmail } from './email.js';
import { requireAdmin, requireAuth } from './auth.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const upload = multer({ storage: multer.memoryStorage() });
const rawSupabaseUrl = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.SUPABASE_REST_URL ||
  ''
).trim();
const rawSupabaseAnonKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  ''
).trim();
const hasSupabaseConfig = /^https?:\/\//i.test(rawSupabaseUrl) && rawSupabaseAnonKey && !/^your_supabase_/i.test(rawSupabaseUrl) && !/^your_supabase_/i.test(rawSupabaseAnonKey);
console.log('Supabase config check:', { hasSupabaseConfig, rawSupabaseUrl: rawSupabaseUrl ? `${rawSupabaseUrl.slice(0, 60)}...` : '(empty)', anonKeySet: !!rawSupabaseAnonKey });
const inMemoryBookings = [];

const inMemoryServices = [
  { name: "Adult Buzz Cut", category: "Men", price: "5000+", duration: 60 },
  { name: "Clean Up - Beard & Neck Trim", category: "Men", price: "2500+", duration: 15 },
  { name: "Gent hair cut", category: "Men", price: "4000+", duration: 30 },
  { name: "Color & Highlights", category: "Men", price: "10000+", duration: 60 },
  { name: "Consultation", category: "Men", price: "2000", duration: 15 },
  { name: "Women's Haircut", category: "Women", price: "6000+", duration: 60 },
  { name: "Color & Highlights", category: "Women", price: "15000+", duration: 120 },
  { name: "Keratin Treatment", category: "Women", price: "25000+", duration: 120 },
  { name: "Bridal Package", category: "Women", price: "50000+", duration: 180 },
  { name: "Consultation", category: "Women", price: "2000", duration: 30 },
];

function isTableMissingError(error) {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  const code = String(error.code || '').toLowerCase();
  return code === '42p01' || (msg.includes('relation') && msg.includes('does not exist'));
}

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: true,
}));
app.use(express.json());

async function adminGuard(req, res) {
  const auth = await requireAdmin(req, authContext);
  if (auth.error) {
    res.status(auth.status).json({ error: auth.error });
    return null;
  }
  return auth;
}

async function authGuard(req, res) {
  const auth = await requireAuth(req, authContext);
  if (auth.error) {
    res.status(auth.status).json({ error: auth.error });
    return null;
  }
  return auth;
}

function missingUserIdColumn(message) {
  const msg = String(message || '').toLowerCase();
  return msg.includes('user_id') && (msg.includes('schema cache') || msg.includes('does not exist'));
}

function buildSupabaseClient(accessToken) {
  if (!hasSupabaseConfig) {
    return null;
  }

  const clientOptions = accessToken
    ? {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
    : undefined;

  return createClient(rawSupabaseUrl, rawSupabaseAnonKey, clientOptions);
}

const supabase = buildSupabaseClient();

// Admin client using service-role key (for privileged operations like deleteUser)
const serviceRoleKey = (process.env.SUPABASE_SERVICE_KEY || '').trim();
const adminSupabase = (hasSupabaseConfig && serviceRoleKey)
  ? createClient(rawSupabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

const authContext = {
  adminSupabase,
  supabaseUrl: rawSupabaseUrl,
  anonKey: rawSupabaseAnonKey,
};

function getAdminDbClient(auth) {
  return adminSupabase || getRequestSupabase(auth.accessToken);
}

function getRequestSupabase(accessToken) {
  if (!hasSupabaseConfig) {
    return null;
  }

  if (!accessToken) return supabase;

  return buildSupabaseClient(accessToken);
}

async function listBookingsInRange(windowStart, windowEnd, accessToken) {
  if (!hasSupabaseConfig) {
    return inMemoryBookings.filter((booking) => booking.appointment_date >= windowStart && booking.appointment_date <= windowEnd);
  }

  const client = getRequestSupabase(accessToken);
  const { data, error } = await client
    .from('bookings')
    .select('appointment_date, service')
    .gte('appointment_date', windowStart)
    .lte('appointment_date', windowEnd);

  if (error) {
    throw error;
  }

  return data || [];
}

async function saveBooking(bookingData, accessToken) {
  if (!hasSupabaseConfig) {
    const savedBooking = {
      id: Date.now(),
      ...bookingData,
    };

    inMemoryBookings.push(savedBooking);
    return { data: [savedBooking], error: null };
  }

  const client = getRequestSupabase(accessToken);
  let { data, error } = await client.from('bookings').insert([bookingData]).select();

  if (error && bookingData.user_id && missingUserIdColumn(error.message)) {
    const fallbackBookingData = { ...bookingData };
    delete fallbackBookingData.user_id;
    ({ data, error } = await client.from('bookings').insert([fallbackBookingData]).select());
  }

  return { data, error };
}

const genAI = new GoogleGenAI({
  apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "",
});

const NATURAL_COLOR_PRESETS = {
  blonde: "CAA36B",
  "light brown": "8A5F46",
  brown: "6C4A36",
  "dark brown": "4A3022",
  auburn: "8D3127",
  ginger: "B55A2A",
  black: "2A211E",
  silver: "AEB1B3",
  burgundy: "4D1A1C",
  chestnut: "7B4C37",
  copper: "A6542A",
  red: "8A2D2A",
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((c) => `${c}${c}`).join('')
    : normalized;

  if (!/^[0-9A-Fa-f]{6}$/.test(value)) {
    return null;
  }

  const int = parseInt(value, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function rgbToHex({ r, g, b }) {
  const toHex = (channel) => channel.toString(16).padStart(2, '0').toUpperCase();
  return `${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) {
      h = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }
  }

  h = Math.round(h * 60);
  if (h < 0) {
    h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h, s, l };
}

function hslToRgb({ h, s, l }) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let rn = 0;
  let gn = 0;
  let bn = 0;

  if (h >= 0 && h < 60) {
    rn = c;
    gn = x;
  } else if (h >= 60 && h < 120) {
    rn = x;
    gn = c;
  } else if (h >= 120 && h < 180) {
    gn = c;
    bn = x;
  } else if (h >= 180 && h < 240) {
    gn = x;
    bn = c;
  } else if (h >= 240 && h < 300) {
    rn = x;
    bn = c;
  } else {
    rn = c;
    bn = x;
  }

  return {
    r: Math.round((rn + m) * 255),
    g: Math.round((gn + m) * 255),
    b: Math.round((bn + m) * 255),
  };
}

function toNaturalHairHex(inputColor) {
  const raw = String(inputColor || '').trim();
  const lower = raw.toLowerCase();

  const preset = NATURAL_COLOR_PRESETS[lower];
  const resolved = preset || raw;

  const rgb = hexToRgb(resolved);
  if (!rgb) {
    return "8D3127";
  }

  const hsl = rgbToHsl(rgb);

  // Keep shades realistic for hair fibers: moderate saturation and protected highlights.
  const adjusted = {
    h: hsl.h,
    s: clamp(hsl.s, 0.15, 0.58),
    l: clamp(hsl.l, 0.13, 0.66),
  };

  // Very bright yellows often look "painted" on hair, so soften them.
  if (adjusted.h >= 35 && adjusted.h <= 58 && adjusted.l > 0.58) {
    adjusted.s = clamp(adjusted.s - 0.1, 0.15, 0.5);
    adjusted.l = 0.58;
  }

  return rgbToHex(hslToRgb(adjusted));
}

function extractAppointmentDetails(message, history, servicesList) {
  const userHistory = (history || []).filter((msg) => msg?.role === 'user');
  const fullConversation = [...userHistory.map((msg) => msg.text), message].join(" ");
  const lowerConversation = fullConversation.toLowerCase();
  const cleanMessage = String(message || '').trim();
  const cleanMessageLower = cleanMessage.toLowerCase();

  const details = {};

  if (servicesList && servicesList.length > 0) {
    for (const service of servicesList) {
      if (lowerConversation.includes(service.name.toLowerCase())) {
        details.service = `${service.name} ${service.duration} min (Rs. ${service.price})`;
        break;
      }
    }
  }

  // Very basic extraction of "tomorrow", dates, and times
  const timeMatch = fullConversation.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
  if (timeMatch) {
    details.appointmentTime = timeMatch[0];
  }

  if (lowerConversation.includes("tomorrow")) {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    details.appointmentDate = tmrw.toISOString().split('T')[0];
  } else {
    details.appointmentDate = new Date().toISOString().split('T')[0];
  }

  const nameMatch = fullConversation.match(/(?:my name is|name is|name:\s*|i'm|i am|im|call me|this is)\s*([A-Za-z]+(?:\s+[A-Za-z]+){0,2})/i);
  if (nameMatch) {
    details.customerName = nameMatch[1].trim();
  } else {
    const plainNameMatch = cleanMessage.match(/^[A-Za-z]+(?:\s+[A-Za-z]+){0,2}$/);
    const commonNonNameTokens = new Set([
      'haircut', 'hair cut', 'trim', 'color', 'colour', 'coloring', 'book', 'booking', 'schedule',
      'yes', 'no', 'okay', 'ok', 'sure', 'tomorrow', 'today', 'tonight', 'morning', 'evening',
    ]);

    if (
      plainNameMatch &&
      cleanMessage.length >= 2 &&
      !commonNonNameTokens.has(cleanMessageLower)
    ) {
      details.customerName = cleanMessage;
    }
  }

  return details;
}

function buildFallbackChatReply({ shouldBook, appointmentDetails, bookingSaved, bookingError }) {
  if (shouldBook && bookingSaved) {
    const service = appointmentDetails?.service || 'service';
    const name = appointmentDetails?.customerName || 'Guest';
    const date = appointmentDetails?.appointmentDate || new Date().toISOString().split('T')[0];
    return `Perfect, ${name}! Your ${service} appointment is booked for ${date}.`;
  }

  if (shouldBook && !appointmentDetails?.service) {
    return "I can book that for you—would you like Haircut & Styling, Color & Highlights, Keratin Treatment, or a Bridal Package?";
  }

  if (!appointmentDetails?.service) {
    return "Got it. Which service would you like to book: Haircut & Styling, Color & Highlights, Keratin Treatment, or a Bridal Package?";
  }

  if (!appointmentDetails?.customerName) {
    return `Great choice—${appointmentDetails.service}. May I have your name for the booking?`;
  }

  if (!shouldBook) {
    return `Thanks, ${appointmentDetails.customerName}. I have ${appointmentDetails.service}. Reply with "book" or "confirm" and I'll save your appointment for today.`;
  }

  if (shouldBook && bookingError) {
    return `I understood your booking request, but I couldn't save it right now (${bookingError}). Please try again in a moment.`;
  }

  return "I can help with bookings—tell me your service and name, then say confirm.";
}

function getPicsartApiKey() {
  const candidates = [
    process.env.PICSART_API_KEY,
    process.env.NEXT_PUBLIC_PICSART_API_KEY,
    process.env.PICSART_KEY,
  ];

  const resolved = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
  return resolved ? resolved.trim() : '';
}

function extractErrorReason(parsedBody, rawBody, status, statusText) {
  const candidates = [
    parsedBody?.message,
    parsedBody?.error,
    parsedBody?.details,
    parsedBody?.detail,
    parsedBody?.errors?.[0]?.message,
    parsedBody?.data?.message,
    parsedBody?.data?.error,
    rawBody,
  ];

  const reason = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
  if (reason) {
    return reason.slice(0, 400);
  }

  return `${status} ${statusText}`;
}

function findFirstHttpUrl(payload, depth = 0) {
  if (depth > 8 || payload == null) {
    return null;
  }

  if (typeof payload === 'string') {
    return /^https?:\/\//i.test(payload) ? payload : null;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = findFirstHttpUrl(item, depth + 1);
      if (found) {
        return found;
      }
    }
    return null;
  }

  if (typeof payload === 'object') {
    const prioritizedKeys = ['url', 'image_url', 'result_url', 'output_url', 'src'];
    for (const key of prioritizedKeys) {
      if (key in payload) {
        const found = findFirstHttpUrl(payload[key], depth + 1);
        if (found) {
          return found;
        }
      }
    }

    for (const value of Object.values(payload)) {
      const found = findFirstHttpUrl(value, depth + 1);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

function extractInferenceId(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return (
    payload?.inference_id ||
    payload?.transaction_id ||
    payload?.id ||
    payload?.data?.inference_id ||
    payload?.data?.transaction_id ||
    payload?.result?.inference_id ||
    null
  );
}

async function pollPaintingResult(inferenceId, picsartApiKey) {
  const maxAttempts = 20;
  const baseDelayMs = 1500;
  const processingStates = new Set(['processing', 'queued', 'pending', 'running', 'in_progress']);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const pollResponse = await fetch(`https://genai-api.picsart.io/v1/painting/${inferenceId}`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'X-Picsart-API-Key': picsartApiKey,
      },
    });

    const pollRaw = await pollResponse.text();
    let pollParsed = null;
    try {
      pollParsed = pollRaw ? JSON.parse(pollRaw) : null;
    } catch {
      pollParsed = null;
    }

    const pollUrl =
      pollParsed?.data?.[0]?.url ||
      pollParsed?.images?.[0]?.url ||
      pollParsed?.image?.url ||
      findFirstHttpUrl(pollParsed);

    if (pollUrl) {
      return pollUrl;
    }

    const apiStatus = String(
      pollParsed?.status || pollParsed?.data?.status || pollParsed?.result?.status || ''
    ).toLowerCase();
    const progress = typeof pollParsed?.progress === 'number'
      ? pollParsed.progress
      : (typeof pollParsed?.data?.progress === 'number' ? pollParsed.data.progress : null);

    const isProcessing = pollResponse.status === 202 || processingStates.has(apiStatus);
    const isTransientServerIssue = [429, 500, 502, 503, 504].includes(pollResponse.status);

    if ((isProcessing || isTransientServerIssue) && attempt < maxAttempts) {
      const delayMs = baseDelayMs + Math.min((attempt - 1) * 250, 2500);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }

    if (isProcessing && attempt >= maxAttempts) {
      const statusLabel = apiStatus || 'processing';
      const progressLabel = progress == null ? 'unknown' : `${progress}%`;
      throw new Error(
        `Picsart polling timed out after ${maxAttempts} checks (status: ${statusLabel}, progress: ${progressLabel}).`
      );
    }

    const reason = extractErrorReason(pollParsed, pollRaw, pollResponse.status, pollResponse.statusText);
    throw new Error(`Picsart polling ${pollResponse.status}: ${reason}`);
  }

  throw new Error('Picsart result polling timed out. Please try again.');
}

async function runPicsartRecolor(file, colorQuery, naturalTargetColorHex, picsartApiKey) {
  // If colorQuery looks like a hex code, use just the hex. Otherwise mention the color name and the hex.
  const isHexOnly = /^#?[0-9A-Fa-f]{3,6}$/.test(colorQuery);
  const colorPhrase = isHexOnly ? `#${naturalTargetColorHex}` : `${colorQuery} tone (color matched as #${naturalTargetColorHex})`;
  const prompt = `Perfectly recolor ONLY the hair to ${colorPhrase}. The person's face, facial features, skin tone, clothing, hairstyle structure, and the entire background MUST remain 100% identical to the original image. Do not change anything except the hair color.`;

  const form = new FormData();
  form.append('image', file.buffer, {
    filename: file.originalname || 'upload.jpg',
    contentType: file.mimetype,
  });
  form.append('prompt', prompt);
  form.append('negative_prompt', 'new face, different identity, changed facial features, altered background, different clothing, different hairstyle, deformed, blur');
  form.append('count', '1');
  form.append('format', 'PNG');

  const picsartResponse = await fetch('https://genai-api.picsart.io/v1/painting/edit?mode=sync', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'X-Picsart-API-Key': picsartApiKey,
      ...form.getHeaders(),
    },
    body: form,
  });

  const rawBody = await picsartResponse.text();
  let parsedBody = null;
  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    parsedBody = null;
  }

  const recoloredImageUrl =
    parsedBody?.data?.[0]?.url ||
    parsedBody?.images?.[0]?.url ||
    parsedBody?.image?.url ||
    parsedBody?.url ||
    findFirstHttpUrl(parsedBody) ||
    null;

  if (recoloredImageUrl) {
    return recoloredImageUrl;
  }

  const inferenceId = extractInferenceId(parsedBody);
  if (inferenceId && (picsartResponse.status === 202 || picsartResponse.ok)) {
    return pollPaintingResult(inferenceId, picsartApiKey);
  }

  const reason = extractErrorReason(parsedBody, rawBody, picsartResponse.status, picsartResponse.statusText);
  throw new Error(`Picsart ${picsartResponse.status}: ${reason}`);
}

function buildAIPrompt(servicesList) {
  const menServices = (servicesList || []).filter(s => s.category.toLowerCase() === 'men')
    .map((s, i) => `${i + 1}. ${s.name} ${s.duration} min - Rs. ${s.price}`).join('\n');
  const womenServices = (servicesList || []).filter(s => s.category.toLowerCase() === 'women')
    .map((s, i) => `${i + 1}. ${s.name} ${s.duration} min - Rs. ${s.price}`).join('\n');

  return `You are Bella, a sophisticated AI receptionist for a luxury salon in Sri Lanka. 
You ONLY handle salon-related queries. NEVER break character.
If asked about topics outside salon services (e.g., coding, politics, recipes, general facts), politely guide the conversation back to the salon.

IMPORTANT BOOKING RULES:
1. To book an appointment, you MUST output a JSON block wrapped in \`\`\`json ... \`\`\`.
2. The user must provide a CATEGORY (Men/Women), a SERVICE, a DATE, and a TIME before you output the JSON.
3. Once all details are gathered, output the final JSON in exactly this format WITHOUT asking if they want anything else:
\`\`\`json
{
  "book": true,
  "service": "[Exact Service Name]",
  "appointmentDate": "YYYY-MM-DD",
  "appointmentTime": "HH:MM AM/PM"
}
\`\`\`

Here is our exact price list in LKR. Use ONLY these services and amounts when booking:

MEN'S SERVICES:
${menServices}

WOMEN'S SERVICES:
${womenServices}

When asked about prices, always ask first if they are looking for Men's or Women's services, then show the corresponding list.
When outputting JSON, ensure the service name matches the list above perfectly.`;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, userId, userEmail, accessToken } = req.body;
    const safeMessage = typeof message === 'string' ? message.trim() : '';
    const safeHistory = Array.isArray(history)
      ? history.filter((msg) => msg && typeof msg.text === 'string' && typeof msg.role === 'string')
      : [];
    const safeUserId = typeof userId === 'string' ? userId.trim() : '';
    const safeUserEmail = typeof userEmail === 'string' ? userEmail.trim() : '';
    const safeAccessToken = typeof accessToken === 'string' ? accessToken.trim() : '';

    if (!safeMessage) {
      return res.status(400).json({ error: "Message is required." });
    }

    // Reuse the exact services fetching logic
    let servicesList = inMemoryServices; // Always defaults to in-memory locally mapped initially
    const client = getRequestSupabase(safeAccessToken);
    if (client) {
      const { data, error } = await client.from('services').select('*').order('category', { ascending: false }).order('name', { ascending: true });
      if (!error || !isTableMissingError(error)) {
        servicesList = data || inMemoryServices;
      }
    }

    const appointmentDetails = extractAppointmentDetails(safeMessage, safeHistory, servicesList);

    const bookingKeywords = ["confirm", "book", "schedule", "yes", "okay", "sure", "perfect", "sounds good"];
    const userConversationText = [
      ...safeHistory.filter((msg) => msg.role === 'user').map((msg) => msg.text),
      safeMessage,
    ].join(' ').toLowerCase();
    const shouldBook = bookingKeywords.some((keyword) => userConversationText.includes(keyword));
    let bookingSaved = false;
    let bookingError = null;

    if (shouldBook && appointmentDetails.service) {
      if (!safeAccessToken || !safeUserId) {
        bookingError = 'Please log in to book an appointment.';
      } else if (!adminSupabase) {
        bookingError = 'Authentication service not configured.';
      } else {
        const { data: { user: bookingUser }, error: bookingAuthErr } = await adminSupabase.auth.getUser(safeAccessToken);
        if (bookingAuthErr || !bookingUser || bookingUser.id !== safeUserId) {
          bookingError = 'Please log in to book an appointment.';
        }
      }

      if (!bookingError) {
      try {
        let dateTimeString = appointmentDetails.appointmentDate || new Date().toISOString().split('T')[0];
        if (appointmentDetails.appointmentTime) {
          try {
            // Rough conversion from 2pm to 14:00:00
            const strTime = appointmentDetails.appointmentTime.toLowerCase();
            const timeMatch = strTime.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
            let hours = timeMatch ? parseInt(timeMatch[1]) : 12;
            let mins = timeMatch && timeMatch[2] ? timeMatch[2] : '00';
            let meridiem = timeMatch && timeMatch[3] ? timeMatch[3] : '';

            if (meridiem === 'pm' && hours < 12) hours += 12;
            if (meridiem === 'am' && hours === 12) hours = 0;

            const hh = String(hours).padStart(2, '0');
            const mm = String(mins).padStart(2, '0');
            dateTimeString = `${dateTimeString}T${hh}:${mm}:00`;
          } catch (e) {
            dateTimeString = `${dateTimeString}T12:00:00`;
          }
        } else {
          dateTimeString = `${dateTimeString}T12:00:00`;
        }


        const appointmentISO = new Date(dateTimeString).toISOString();
        const start = new Date(appointmentISO);
        const durationMatch = appointmentDetails.service.match(/(\d+)\s*min/);
        const duration = durationMatch ? parseInt(durationMatch[1]) : 60;
        const end = new Date(start.getTime() + duration * 60000);

        // Fetch bookings within a 24-hour window of the target time to be safe with timezones
        const windowStart = new Date(start.getTime() - 12 * 60 * 60 * 1000).toISOString();
        const windowEnd = new Date(start.getTime() + 12 * 60 * 60 * 1000).toISOString();



        const existingBookings = await listBookingsInRange(windowStart, windowEnd, safeAccessToken);

        let isOverlapping = false;
        for (const booking of (existingBookings || [])) {
          const bStart = new Date(booking.appointment_date);
          const bDurMatch = booking.service ? booking.service.match(/(\d+)\s*min/) : null;
          const bDur = bDurMatch ? parseInt(bDurMatch[1]) : 60;
          const bEnd = new Date(bStart.getTime() + bDur * 60000);

          // Standard overlap check: max(start1, start2) < min(end1, end2)
          if (Math.max(start.getTime(), bStart.getTime()) < Math.min(end.getTime(), bEnd.getTime())) {
            isOverlapping = true;
            break;
          }
        }

        if (isOverlapping) {
          bookingError = "This time slot is already booked. Please choose another time.";
        } else {
          const bookingData = {
            customer_name: appointmentDetails.customerName || "Guest",
            service: appointmentDetails.service,
            appointment_date: appointmentISO,
          };

          if (safeUserId) {
            bookingData.user_id = safeUserId;
          }
          if (safeUserEmail) {
            bookingData.user_email = safeUserEmail;
          }

          console.log("Saving appointment to Supabase:", bookingData);

          const { data, error } = await saveBooking(bookingData, safeAccessToken);

          if (error) {
            console.error("Supabase error:", error);
            bookingError = error.message || 'database error';
          } else {
            console.log("Appointment saved successfully:", data);
            bookingSaved = true;

            if (safeUserEmail) {
              sendBookingConfirmationEmail({
                to: safeUserEmail,
                name: bookingData.customer_name,
                service: bookingData.service,
                appointmentDate: bookingData.appointment_date,
              }).catch((err) => console.error('Email send error:', err));
            }
          }
        }
      } catch (dbError) {
        console.error("Database error:", dbError);
        bookingError = dbError instanceof Error ? dbError.message : 'database error';
      }
      }
    } else {
      console.log("Booking conditions not met:", { shouldBook, service: appointmentDetails.service, message: safeMessage });
    }

    const fallbackText = buildFallbackChatReply({
      shouldBook,
      appointmentDetails,
      bookingSaved,
      bookingError,
    });

    let responseText = fallbackText;

    const contents = safeHistory.length > 0
      ? [
        ...safeHistory.map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        })),
        {
          role: "user",
          parts: [{ text: safeMessage }],
        },
      ]
      : [{ role: "user", parts: [{ text: safeMessage }] }]; // Use array format consistently

    if (shouldBook && bookingSaved) {
      contents.push({
        role: "user",
        parts: [{ text: "SYSTEM MESSAGE: The booking was successfully saved to the database. Let the user know." }]
      });
    } else if (shouldBook && bookingError) {
      contents.push({
        role: "user",
        parts: [{ text: `SYSTEM MESSAGE: The booking failed due to an error: ${bookingError}. Apologize to the user.` }]
      });
    }

    if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      try {
        const result = await genAI.models.generateContent({
          model: "gemini-2.5-flash",
          contents: contents,
          config: {
            systemInstruction: buildAIPrompt(servicesList),
          },
        });

        if (result?.text) {
          responseText = result.text;
        }
      } catch (geminiError) {
        console.error("Gemini API Error:", geminiError);
      }
    } else {
      console.warn("Gemini API key not configured; using fallback chat reply.");
    }

    res.json({
      text: responseText,
      appointmentDetails: shouldBook ? appointmentDetails : null,
      bookingSaved,
      bookingError,
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

app.post('/api/recolor-hair', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const picsartApiKey = getPicsartApiKey();
    if (!picsartApiKey) {
      return res.status(500).json({
        error: 'Picsart API key is missing in backend environment. Set PICSART_API_KEY in backend/.env and restart backend.',
      });
    }

    const targetColorHex = req.body.color || "8D3127";
    const naturalTargetColorHex = toNaturalHairHex(targetColorHex);

    console.log(`Processing hair recolor request to Hex/Color: ${targetColorHex} (naturalized: ${naturalTargetColorHex}) with Picsart...`);

    let recoloredImageUrl = null;
    try {
      recoloredImageUrl = await runPicsartRecolor(req.file, targetColorHex, naturalTargetColorHex, picsartApiKey);
    } catch (picsartError) {
      const reason = picsartError instanceof Error ? picsartError.message : 'Unknown Picsart failure';
      console.error('Picsart API Error:', reason);
      return res.status(502).json({
        error: 'Picsart failed to process the image.',
        details: reason,
      });
    }

    const originalDataURI = "data:" + req.file.mimetype + ";base64," + req.file.buffer.toString("base64");

    res.json({
      originalUrl: originalDataURI,
      recoloredUrl: recoloredImageUrl,
      appliedColor: naturalTargetColorHex,
      provider: 'picsart',
    });
  } catch (error) {
    console.error("Recolor Error:", error);
    res.status(500).json({ error: "Failed to recolor image" });
  }
});

app.get('/api/booked-slots', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "Date is required" });

    // Fetch all bookings for a 24h window around the date (UTC safe)
    const targetDate = new Date(date);
    const windowStart = new Date(targetDate.getTime() - 12 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(targetDate.getTime() + 36 * 60 * 60 * 1000).toISOString();

    const data = await listBookingsInRange(windowStart, windowEnd, null);
    res.json(data);
  } catch (error) {
    console.error("Fetch Booked Slots Error:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

app.post('/api/book-manual', async (req, res) => {
  try {
    const auth = await authGuard(req, res);
    if (!auth) return;

    const { name, service, date, userId, userEmail, accessToken } = req.body;

    if (!name || !service || !date) {
      return res.status(400).json({ error: "Missing required fields: name, service, or date." });
    }

    if (userId && userId !== auth.user.id) {
      return res.status(403).json({ error: 'User ID does not match authenticated session.' });
    }

    const resolvedUserId = auth.user.id;
    const resolvedUserEmail = userEmail || auth.user.email;
    const resolvedAccessToken = accessToken || auth.accessToken;

    const start = new Date(date);
    const durationMatch = service.match(/(\d+)\s*min/);
    const duration = durationMatch ? parseInt(durationMatch[1]) : 60;
    const end = new Date(start.getTime() + duration * 60000);

    // Fetch bookings within a 24-hour window of the target time
    const windowStart = new Date(start.getTime() - 12 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(start.getTime() + 12 * 60 * 60 * 1000).toISOString();

    const existingBookings = await listBookingsInRange(windowStart, windowEnd, resolvedAccessToken);

    let isOverlapping = false;
    for (const booking of (existingBookings || [])) {
      const bStart = new Date(booking.appointment_date);
      const bDurMatch = booking.service ? booking.service.match(/(\d+)\s*min/) : null;
      const bDur = bDurMatch ? parseInt(bDurMatch[1]) : 60;
      const bEnd = new Date(bStart.getTime() + bDur * 60000);

      if (Math.max(start.getTime(), bStart.getTime()) < Math.min(end.getTime(), bEnd.getTime())) {
        isOverlapping = true;
        break;
      }
    }

    if (isOverlapping) {
      return res.status(409).json({ error: "This time slot is already booked. Please choose another time." });
    }

    const bookingData = {
      customer_name: name,
      service: service,
      appointment_date: date,
    };

    if (resolvedUserId) {
      bookingData.user_id = resolvedUserId;
    }
    if (resolvedUserEmail) {
      bookingData.user_email = resolvedUserEmail;
    }

    const { data, error } = await saveBooking(bookingData, resolvedAccessToken);

    if (error) {
      return res.status(500).json({ error: error.message || 'database error' });
    }

    if (resolvedUserEmail) {
      sendBookingConfirmationEmail({
        to: resolvedUserEmail,
        name,
        service,
        appointmentDate: date,
      }).catch((err) => console.error('Email send error:', err));
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error("Manual Booking Error:", error);
    res.status(500).json({ error: "Failed to book appointment." });
  }
});

app.post('/api/delete-bookings', async (req, res) => {
  try {
    const auth = await adminGuard(req, res);
    if (!auth) return;

    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: "Booking IDs are required." });
    }

    const client = getAdminDbClient(auth);
    if (!client && hasSupabaseConfig) throw new Error("Supabase client not configured");

    const normalizedIds = ids.map(id => !isNaN(Number(id)) && typeof id !== 'boolean' ? Number(id) : id);

    const { error } = await client
      .from('bookings')
      .delete()
      .in('id', normalizedIds);

    if (error) {
      console.error("Delete Error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Delete Endpoint Error:", error);
    res.status(500).json({ error: "Failed to delete bookings." });
  }
});

// --- SERVICES ENDPOINTS ---

app.get('/api/services', async (req, res) => {
  try {
    const { accessToken } = req.query;
    const client = getRequestSupabase(accessToken);

    if (!client) {
      throw new Error("Supabase client not initialized.");
    }

    const { data, error } = await client
      .from('services')
      .select('*')
      .order('category', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }
    const mappedData = (data || []).map(s => {
      if (s.name && s.name.includes('|||')) {
        const [realName, desc] = s.name.split('|||');
        return { ...s, name: realName, description: desc };
      }
      return s;
    });
    return res.json(mappedData);
  } catch (error) {
    console.error("Fetch Services Error:", error);
    res.status(500).json({ error: "Failed to fetch services." });
  }
});

app.post('/api/services', async (req, res) => {
  try {
    const auth = await adminGuard(req, res);
    if (!auth) return;

    const { name, category, price, duration, description } = req.body;
    const client = getAdminDbClient(auth);

    if (!client) {
      throw new Error("Supabase client not initialized.");
    }

    let finalName = name;
    if (description) {
      finalName = `${name}|||${description}`;
    }

    const { data, error } = await client
      .from('services')
      .insert([{ name: finalName, category, price, duration }])
      .select();

    if (error) {
      throw error;
    }
    return res.json({ success: true, data });
  } catch (error) {
    console.error("Add Service Error:", error);
    res.status(500).json({ error: error.message || "Failed to add service." });
  }
});

app.put('/api/services/:id', async (req, res) => {
  try {
    const auth = await adminGuard(req, res);
    if (!auth) return;

    const id = req.params.id;
    const { name, category, price, duration, description } = req.body;
    const client = getAdminDbClient(auth);

    if (!client) {
      throw new Error("Supabase client not initialized.");
    }

    let finalName = name;
    if (description) {
      finalName = `${name}|||${description}`;
    }

    const { data, error } = await client
      .from('services')
      .update({ name: finalName, category, price, duration })
      .eq('id', id)
      .select();

    if (error) {
      throw error;
    }
    return res.json({ success: true, data });
  } catch (error) {
    console.error("Update Service Error:", error);
    res.status(500).json({ error: error.message || "Failed to update service." });
  }
});

app.delete('/api/services/:id', async (req, res) => {
  try {
    const auth = await adminGuard(req, res);
    if (!auth) return;

    const id = req.params.id;
    const client = getAdminDbClient(auth);

    if (!client) {
      throw new Error("Supabase client not initialized.");
    }

    const { error } = await client
      .from('services')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
    return res.json({ success: true });
  } catch (error) {
    console.error("Delete Service Error:", error);
    res.status(500).json({ error: error.message || "Failed to delete service." });
  }
});

// --- UPLOAD ENDPOINT ---
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    const auth = await adminGuard(req, res);
    if (!auth) return;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Only JPEG, PNG, WebP, and GIF images are allowed.' });
    }

    const uploadDir = path.join(__dirname, '../frontend/public/customers');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(req.file.originalname)}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, req.file.buffer);

    return res.json({
      success: true,
      url: `/customers/${filename}`
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

// --- LOOKBOOK ENDPOINTS ---

app.get('/api/lookbook', async (req, res) => {
  try {
    const { accessToken } = req.query;
    const client = getRequestSupabase(accessToken);

    if (!client) {
      throw new Error("Supabase client not initialized.");
    }

    const { data, error } = await client
      .from('lookbook')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }
    return res.json(data || []);
  } catch (error) {
    console.error("Fetch Lookbook Error:", error);
    res.status(500).json({ error: "Failed to fetch lookbook images." });
  }
});

app.post('/api/lookbook', async (req, res) => {
  try {
    const auth = await adminGuard(req, res);
    if (!auth) return;

    const { src, alt } = req.body;
    const client = getAdminDbClient(auth);

    if (!client) {
      throw new Error("Supabase client not initialized.");
    }

    const { data, error } = await client
      .from('lookbook')
      .insert([{ src, alt }])
      .select();

    if (error) {
      throw error;
    }
    return res.json({ success: true, data });
  } catch (error) {
    console.error("Add Lookbook Image Error:", error);
    res.status(500).json({ error: error.message || "Failed to add image." });
  }
});

app.delete('/api/lookbook/:id', async (req, res) => {
  try {
    const auth = await adminGuard(req, res);
    if (!auth) return;

    const id = req.params.id;
    const client = getAdminDbClient(auth);

    if (!client) {
      throw new Error("Supabase client not initialized.");
    }

    const { error } = await client
      .from('lookbook')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
    return res.json({ success: true });
  } catch (error) {
    console.error("Delete Lookbook Image Error:", error);
    res.status(500).json({ error: error.message || "Failed to delete image." });
  }
});


// ============================================================
// USER MANAGEMENT ENDPOINTS
// ============================================================

// POST /api/register-user
// Called after successful Supabase Auth signup to store profile (no password storage)
app.post('/api/register-user', async (req, res) => {
  try {
    const auth = await authGuard(req, res);
    if (!auth) return;

    const { userId, name, email } = req.body;
    if (!userId || !email) {
      return res.status(400).json({ error: 'userId and email are required.' });
    }

    if (userId !== auth.user.id) {
      return res.status(403).json({ error: 'User ID does not match authenticated session.' });
    }

    if (email.toLowerCase() !== auth.user.email?.toLowerCase()) {
      return res.status(403).json({ error: 'Email does not match authenticated session.' });
    }

    if (!adminSupabase) {
      return res.status(500).json({ error: 'Service role key not configured on server.' });
    }

    const profileName = name || email.split('@')[0];
    const { data: existingProfile } = await adminSupabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    const { error } = existingProfile
      ? await adminSupabase
        .from('user_profiles')
        .update({ name: profileName, email })
        .eq('id', userId)
      : await adminSupabase
        .from('user_profiles')
        .insert([{ id: userId, name: profileName, email }]);

    if (error) {
      console.error('Insert user_profiles error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Register-user error:', err);
    res.status(500).json({ error: 'Failed to save user profile.' });
  }
});

// GET /api/users
// Returns masked list of registered users for admin panel
app.get('/api/users', async (req, res) => {
  try {
    const auth = await adminGuard(req, res);
    if (!auth) return;

    if (!adminSupabase) {
      return res.status(500).json({ error: 'Service role key not configured.' });
    }

    // Fetch user profiles
    const { data: profiles, error: profErr } = await adminSupabase
      .from('user_profiles')
      .select('id, name, email, created_at')
      .order('created_at', { ascending: false });

    if (profErr) {
      return res.status(500).json({ error: profErr.message });
    }

    // Fetch booking counts per user_id
    const { data: bookings } = await adminSupabase
      .from('bookings')
      .select('user_id');

    const bookingCounts = {};
    (bookings || []).forEach(b => {
      if (b.user_id) bookingCounts[b.user_id] = (bookingCounts[b.user_id] || 0) + 1;
    });

    const maskEmail = (email) => {
      const [local, domain] = email.split('@');
      if (!domain) return email;
      const visible = local.charAt(0);
      return `${visible}${'*'.repeat(Math.min(local.length - 1, 5))}@${domain}`;
    };

    const users = (profiles || []).map(p => ({
      id: p.id,
      name: p.name,
      email: maskEmail(p.email),
      created_at: p.created_at,
      bookingCount: bookingCounts[p.id] || 0,
    }));

    res.json(users);
  } catch (err) {
    console.error('GET /api/users error:', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// GET /api/admin/users
// Returns UNMASKED list of all registered users for admin panel
app.get('/api/admin/users', async (req, res) => {
  try {
    const auth = await adminGuard(req, res);
    if (!auth) return;

    if (!adminSupabase) {
      return res.status(500).json({ error: 'Service role key not configured.' });
    }

    // Fetch user profiles with full email
    const { data: profiles, error: profErr } = await adminSupabase
      .from('user_profiles')
      .select('id, name, email, created_at')
      .order('created_at', { ascending: false });

    if (profErr) {
      console.error('Admin users fetch error:', profErr);
      return res.status(500).json({ error: profErr.message });
    }

    // Fetch booking counts and last booking per user_id
    const { data: bookings } = await adminSupabase
      .from('bookings')
      .select('user_id, service, appointment_date');

    const bookingCounts = {};
    const lastBookings = {};
    const totalSpent = {};

    (bookings || []).forEach(b => {
      if (b.user_id) {
        bookingCounts[b.user_id] = (bookingCounts[b.user_id] || 0) + 1;
        if (!lastBookings[b.user_id] || new Date(b.appointment_date) > new Date(lastBookings[b.user_id])) {
          lastBookings[b.user_id] = b.appointment_date;
        }
        const priceMatch = b.service?.match(/Rs\.\s*(\d+)/);
        if (priceMatch) {
          totalSpent[b.user_id] = (totalSpent[b.user_id] || 0) + parseInt(priceMatch[1]);
        }
      }
    });

    // Also fetch auth provider info if available
    const users = (profiles || []).map(p => ({
      id: p.id,
      name: p.name,
      email: p.email, // unmasked for admin
      created_at: p.created_at,
      bookingCount: bookingCounts[p.id] || 0,
      lastBooking: lastBookings[p.id] || null,
      totalSpent: totalSpent[p.id] || 0,
    }));

    res.json(users);
  } catch (err) {
    console.error('GET /api/admin/users error:', err);
    res.status(500).json({ error: 'Failed to fetch admin users.' });
  }
});

// DELETE /api/users/:id
// Admin endpoint: deletes auth user, all their bookings, and their profile
app.delete('/api/users/:id', async (req, res) => {
  try {
    const auth = await adminGuard(req, res);
    if (!auth) return;

    const { id } = req.params;

    if (!adminSupabase) {
      return res.status(500).json({ error: 'Service role key not configured.' });
    }

    // 1. Delete all bookings for this user
    await adminSupabase.from('bookings').delete().eq('user_id', id);

    // 2. Delete from user_profiles table
    await adminSupabase.from('user_profiles').delete().eq('id', id);

    // 3. Delete from Supabase Auth
    const { error: delErr } = await adminSupabase.auth.admin.deleteUser(id);
    if (delErr) {
      console.error('Auth delete error:', delErr);
      return res.status(500).json({ error: delErr.message });
    }

    res.json({ success: true, message: 'User account and all associated data deleted.' });
  } catch (err) {
    console.error('DELETE /api/users/:id error:', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
