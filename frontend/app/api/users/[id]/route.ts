import { NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { authContext, adminSupabase } from '@/utils/supabaseServer';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireAdmin(req, authContext);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!adminSupabase) {
      return NextResponse.json({ error: 'Service role key not configured.' }, { status: 500 });
    }

    // 1. Delete bookings
    await adminSupabase.from('bookings').delete().eq('user_id', id);

    // 2. Delete profile
    await adminSupabase.from('user_profiles').delete().eq('id', id);

    // 3. Delete auth account
    const { error: delErr } = await adminSupabase.auth.admin.deleteUser(id);
    if (delErr) {
      console.error('Auth delete error:', delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'User account and all associated data deleted.' });
  } catch (err: any) {
    console.error('DELETE /api/users/:id error:', err);
    return NextResponse.json({ error: 'Failed to delete user.' }, { status: 500 });
  }
}
