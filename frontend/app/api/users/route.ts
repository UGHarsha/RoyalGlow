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
      return NextResponse.json({ error: profErr.message }, { status: 500 });
    }

    const { data: bookings } = await adminSupabase
      .from('bookings')
      .select('user_id');

    const bookingCounts: Record<string, number> = {};
    (bookings || []).forEach((b: any) => {
      if (b.user_id) bookingCounts[b.user_id] = (bookingCounts[b.user_id] || 0) + 1;
    });

    const maskEmail = (emailStr: string) => {
      const [local, domain] = emailStr.split('@');
      if (!domain) return emailStr;
      const visible = local.charAt(0);
      return `${visible}${'*'.repeat(Math.min(local.length - 1, 5))}@${domain}`;
    };

    const users = (profiles || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      email: maskEmail(p.email),
      created_at: p.created_at,
      bookingCount: bookingCounts[p.id] || 0,
    }));

    return NextResponse.json(users);
  } catch (err) {
    console.error('GET /api/users error:', err);
    return NextResponse.json({ error: 'Failed to fetch users.' }, { status: 500 });
  }
}
