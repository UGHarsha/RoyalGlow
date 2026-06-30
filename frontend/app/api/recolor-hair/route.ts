import { NextResponse } from 'next/server';

const NATURAL_COLOR_PRESETS: Record<string, string> = {
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hexToRgb(hex: string) {
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

function rgbToHex({ r, g, b }: { r: number, g: number, b: number }): string {
  const toHex = (channel: number) => channel.toString(16).padStart(2, '0').toUpperCase();
  return `${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl({ r, g, b }: { r: number, g: number, b: number }) {
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

function hslToRgb({ h, s, l }: { h: number, s: number, l: number }) {
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

function toNaturalHairHex(inputColor: string): string {
  const raw = String(inputColor || '').trim();
  const lower = raw.toLowerCase();

  const preset = NATURAL_COLOR_PRESETS[lower];
  const resolved = preset || raw;

  const rgb = hexToRgb(resolved);
  if (!rgb) {
    return "8D3127";
  }

  const hsl = rgbToHsl(rgb);

  const adjusted = {
    h: hsl.h,
    s: clamp(hsl.s, 0.15, 0.58),
    l: clamp(hsl.l, 0.13, 0.66),
  };

  if (adjusted.h >= 35 && adjusted.h <= 58 && adjusted.l > 0.58) {
    adjusted.s = clamp(adjusted.s - 0.1, 0.15, 0.5);
    adjusted.l = 0.58;
  }

  return rgbToHex(hslToRgb(adjusted));
}

function getPicsartApiKey(): string {
  const candidates = [
    process.env.PICSART_API_KEY,
    process.env.NEXT_PUBLIC_PICSART_API_KEY,
    process.env.PICSART_KEY,
  ];

  const resolved = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
  return resolved ? resolved.trim() : '';
}

function extractErrorReason(parsedBody: any, rawBody: string, status: number, statusText: string): string {
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

function findFirstHttpUrl(payload: any, depth = 0): string | null {
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

function extractInferenceId(payload: any): string | null {
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

async function pollPaintingResult(inferenceId: string, picsartApiKey: string): Promise<string> {
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
    let pollParsed: any = null;
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

async function runPicsartRecolor(file: { buffer: Buffer, originalname: string, mimetype: string }, colorQuery: string, naturalTargetColorHex: string, picsartApiKey: string): Promise<string> {
  const isHexOnly = /^#?[0-9A-Fa-f]{3,6}$/.test(colorQuery);
  const colorPhrase = isHexOnly ? `#${naturalTargetColorHex}` : `${colorQuery} tone (color matched as #${naturalTargetColorHex})`;
  const prompt = `Perfectly recolor ONLY the hair to ${colorPhrase}. The person's face, facial features, skin tone, clothing, hairstyle structure, and the entire background MUST remain 100% identical to the original image. Do not change anything except the hair color.`;

  const form = new FormData();
  const fileBlob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });
  form.append('image', fileBlob, file.originalname || 'upload.jpg');
  form.append('prompt', prompt);
  form.append('negative_prompt', 'new face, different identity, changed facial features, altered background, different clothing, different hairstyle, deformed, blur');
  form.append('count', '1');
  form.append('format', 'PNG');

  const picsartResponse = await fetch('https://genai-api.picsart.io/v1/painting/edit?mode=sync', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'X-Picsart-API-Key': picsartApiKey,
    },
    body: form,
  });

  const rawBody = await picsartResponse.text();
  let parsedBody: any = null;
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

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    const targetColorHex = (formData.get('color') as string) || "8D3127";

    if (!file) {
      return NextResponse.json({ error: "No image uploaded" }, { status: 400 });
    }

    const picsartApiKey = getPicsartApiKey();
    if (!picsartApiKey) {
      return NextResponse.json({
        error: 'Picsart API key is missing in backend environment. Set PICSART_API_KEY in environment variables.',
      }, { status: 500 });
    }

    const naturalTargetColorHex = toNaturalHairHex(targetColorHex);

    console.log(`Processing hair recolor request to Hex/Color: ${targetColorHex} (naturalized: ${naturalTargetColorHex}) with Picsart...`);

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileObj = {
      buffer: fileBuffer,
      originalname: file.name,
      mimetype: file.type,
    };

    let recoloredImageUrl = null;
    try {
      recoloredImageUrl = await runPicsartRecolor(fileObj, targetColorHex, naturalTargetColorHex, picsartApiKey);
    } catch (picsartError: any) {
      const reason = picsartError instanceof Error ? picsartError.message : 'Unknown Picsart failure';
      console.error('Picsart API Error:', reason);
      return NextResponse.json({
        error: 'Picsart failed to process the image.',
        details: reason,
      }, { status: 502 });
    }

    const originalDataURI = "data:" + file.type + ";base64," + fileBuffer.toString("base64");

    return NextResponse.json({
      originalUrl: originalDataURI,
      recoloredUrl: recoloredImageUrl,
      appliedColor: naturalTargetColorHex,
      provider: 'picsart',
    });
  } catch (error) {
    console.error("Recolor Error:", error);
    return NextResponse.json({ error: "Failed to recolor image" }, { status: 500 });
  }
}
