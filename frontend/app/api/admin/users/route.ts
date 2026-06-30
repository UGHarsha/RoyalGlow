import { NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { authContext, adminSupabase } from '@/utils/supabaseServer';

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req, authContext);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!adminSupabase) {
      return NextResponse.json({ error: 'Service role key not configured.' }, { status: 500 });
    }

    const { data: profiles, error: profErr } = await adminSupabase
      .from('user_profiles')
      .select('id, name, email, created_at')
      .order('created_at', { ascending: false });

    if (profErr) {
      console.error('Admin users fetch error:', profErr);
      return NextResponse.json({ error: profErr.message }, { status: 500 });
    }

    const { data: bookings } = await adminSupabase
      .from('bookings')
      .select('user_id, service, appointment_date');

    const bookingCounts: Record<string, number> = {};
    const lastBookings: Record<string, string> = {};
    const totalSpent: Record<string, number> = {};

    (bookings || []).forEach((b: any) => {
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

    const users = (profiles || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      created_at: p.created_at,
      bookingCount: bookingCounts[p.id] || 0,
      lastBooking: lastBookings[p.id] || null,
      totalSpent: totalSpent[p.id] || 0,
    }));

    return NextResponse.json(users);
  } catch (err) {
    console.error('GET /api/admin/users error:', err);
    return NextResponse.json({ error: 'Failed to fetch admin users.' }, { status: 500 });
  }
}
