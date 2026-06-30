import { NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import {
  authContext,
  getAdminDbClient,
  hasSupabaseConfig,
} from '@/utils/supabaseServer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const auth = await requireAdmin(req, authContext, body);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { ids } = body;
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: "Booking IDs are required." }, { status: 400 });
    }

    const client = getAdminDbClient(auth);
    if (!client && hasSupabaseConfig) throw new Error("Supabase client not configured");

    const normalizedIds = ids.map(id => !isNaN(Number(id)) && typeof id !== 'boolean' ? Number(id) : id);

    if (client) {
      const { error } = await client
        .from('bookings')
        .delete()
        .in('id', normalizedIds);

      if (error) {
        console.error("Delete Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Endpoint Error:", error);
    return NextResponse.json({ error: "Failed to delete bookings." }, { status: 500 });
  }
}
