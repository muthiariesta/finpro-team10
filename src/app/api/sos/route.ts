import { NextResponse } from 'next/server';

/**
 * Mengirim peringatan SOS ke kontak darurat.
 *
 * Pengiriman nyata terjadi hanya bila FONNTE_TOKEN diisi. Tanpa itu, endpoint
 * ini mengembalikan simulated: true dan antarmuka WAJIB menyatakannya apa
 * adanya. Menampilkan "terkirim ke 2 kontak darurat" padahal tidak ada yang
 * dikirim adalah kebohongan yang justru berbahaya pada aplikasi keselamatan:
 * pengguna bisa berhenti mencari pertolongan lain karena mengira bantuan
 * sudah dalam perjalanan.
 *
 * Fonnte dipilih sebagai contoh karena paling mudah dipakai di Indonesia
 * (satu token, tanpa verifikasi bisnis). Gateway lain tinggal mengganti
 * bagian sendViaFonnte.
 */

const FONNTE_URL = 'https://api.fonnte.com/send';
const TIMEOUT_MS = 15_000;

interface SosContact {
  name: string;
  phone: string;
}

interface DispatchResult {
  name: string;
  phone: string;
  ok: boolean;
  error?: string;
}

/** Menormalkan nomor ke format internasional tanpa tanda plus. */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}

async function sendViaFonnte(
  token: string,
  contact: SosContact,
  message: string
): Promise<DispatchResult> {
  try {
    const res = await fetch(FONNTE_URL, {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        target: normalizePhone(contact.phone),
        message,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.status === false) {
      return {
        name: contact.name,
        phone: contact.phone,
        ok: false,
        error: body?.reason || `gateway responded ${res.status}`,
      };
    }
    return { name: contact.name, phone: contact.phone, ok: true };
  } catch (err) {
    return {
      name: contact.name,
      phone: contact.phone,
      ok: false,
      error: err instanceof Error ? err.message : 'request failed',
    };
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const contacts: SosContact[] = Array.isArray(body.contacts) ? body.contacts : [];
  const { lat, lon, trackingUrl } = body as {
    lat?: number;
    lon?: number;
    trackingUrl?: string;
  };

  if (contacts.length === 0) {
    return NextResponse.json({ error: 'no emergency contacts provided' }, { status: 400 });
  }

  const coords =
    typeof lat === 'number' && typeof lon === 'number'
      ? `${lat.toFixed(4)}, ${lon.toFixed(4)}`
      : 'unavailable';
  const mapsUrl =
    typeof lat === 'number' && typeof lon === 'number'
      ? `https://www.google.com/maps?q=${lat},${lon}`
      : null;

  const message = [
    'SafeHer EMERGENCY ALERT',
    '',
    'Someone who listed you as an emergency contact has triggered an SOS.',
    `Last known location: ${coords}`,
    mapsUrl ? `Map: ${mapsUrl}` : null,
    trackingUrl ? `Live tracking: ${trackingUrl}` : null,
    '',
    'Please try to reach them immediately.',
  ]
    .filter(Boolean)
    .join('\n');

  const token = process.env.FONNTE_TOKEN;

  // Tanpa gateway, jangan berpura-pura mengirim.
  if (!token) {
    console.warn('[sos] FONNTE_TOKEN belum diisi - pengiriman disimulasikan');
    return NextResponse.json({
      simulated: true,
      message,
      results: contacts.map((c) => ({ name: c.name, phone: c.phone, ok: false })),
    });
  }

  // Berurutan, bukan paralel: gateway WhatsApp umumnya membatasi laju kirim,
  // dan jumlah kontak darurat memang sedikit.
  const results: DispatchResult[] = [];
  for (const contact of contacts) {
    results.push(await sendViaFonnte(token, contact, message));
  }

  const delivered = results.filter((r) => r.ok).length;
  if (delivered === 0) {
    console.error('[sos] semua pengiriman gagal:', JSON.stringify(results));
  }

  return NextResponse.json({ simulated: false, delivered, results });
}
