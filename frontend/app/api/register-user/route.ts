import { NextResponse } from 'next/server';
import { requireAuth } from '@/utils/auth';
import { authContext, adminSupabase } from '@/utils/supabaseServer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const auth = await requireAuth(req, authContext, body);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId, name, email } = body;
    if (!userId || !email) {
      return NextResponse.json({ error: 'userId and email are required.' }, { status: 400 });
    }

    if (userId !== auth.user.id) {
      return NextResponse.json({ error: 'User ID does not match authenticated session.' }, { status: 403 });
    }

    if (email.toLowerCase() !== auth.user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'Email does not match authenticated session.' }, { status: 403 });
    }

    if (!adminSupabase) {
      return NextResponse.json({ error: 'Service role key not configured on server.' }, { status: 500 });
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Register-user error:', err);
    return NextResponse.json({ error: 'Failed to save user profile.' }, { status: 500 });
  }
}
