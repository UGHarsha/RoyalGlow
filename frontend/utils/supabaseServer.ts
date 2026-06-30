import { createClient } from '@supabase/supabase-js';

export const rawSupabaseUrl = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.SUPABASE_REST_URL ||
  ''
).trim();

export const rawSupabaseAnonKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  ''
).trim();

export const hasSupabaseConfig =
  /^https?:\/\//i.test(rawSupabaseUrl) &&
  !!rawSupabaseAnonKey &&
  !/^your_supabase_/i.test(rawSupabaseUrl) &&
  !/^your_supabase_/i.test(rawSupabaseAnonKey);

export const inMemoryBookings: any[] = [];

export const inMemoryServices = [
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

export function isTableMissingError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  const code = String(error.code || '').toLowerCase();
  return code === '42p01' || (msg.includes('relation') && msg.includes('does not exist'));
}

export function buildSupabaseClient(accessToken?: string | null) {
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

export const supabase = buildSupabaseClient();

// Admin client using service-role key
export const serviceRoleKey = (process.env.SUPABASE_SERVICE_KEY || '').trim();
export const adminSupabase = (hasSupabaseConfig && serviceRoleKey)
  ? createClient(rawSupabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

export const authContext = {
  adminSupabase,
  supabaseUrl: rawSupabaseUrl,
  anonKey: rawSupabaseAnonKey,
};

export function getRequestSupabase(accessToken?: string | null) {
  if (!hasSupabaseConfig) {
    return null;
  }
  if (!accessToken) return supabase;
  return buildSupabaseClient(accessToken);
}

export function getAdminDbClient(auth: { accessToken: string | null }) {
  return adminSupabase || getRequestSupabase(auth.accessToken);
}

function missingUserIdColumn(message: string): boolean {
  const msg = String(message || '').toLowerCase();
  return msg.includes('user_id') && (msg.includes('schema cache') || msg.includes('does not exist'));
}

export async function listBookingsInRange(windowStart: string, windowEnd: string, accessToken?: string | null) {
  if (!hasSupabaseConfig) {
    return inMemoryBookings.filter((booking) => booking.appointment_date >= windowStart && booking.appointment_date <= windowEnd);
  }

  const client = getRequestSupabase(accessToken);
  if (!client) return [];

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

export async function saveBooking(bookingData: any, accessToken?: string | null) {
  if (!hasSupabaseConfig) {
    const savedBooking = {
      id: Date.now(),
      ...bookingData,
    };

    inMemoryBookings.push(savedBooking);
    return { data: [savedBooking], error: null };
  }

  const client = getRequestSupabase(accessToken);
  if (!client) return { data: null, error: new Error('Supabase client not initialized') };

  let { data, error } = await client.from('bookings').insert([bookingData]).select();

  if (error && bookingData.user_id && missingUserIdColumn(error.message)) {
    const fallbackBookingData = { ...bookingData };
    delete fallbackBookingData.user_id;
    ({ data, error } = await client.from('bookings').insert([fallbackBookingData]).select());
  }

  return { data, error };
}
