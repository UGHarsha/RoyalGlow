import { NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import {
  authContext,
  getRequestSupabase,
  getAdminDbClient,
} from '@/utils/supabaseServer';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const accessToken = url.searchParams.get('accessToken');
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

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Fetch Lookbook Error:", error);
    return NextResponse.json({ error: "Failed to fetch lookbook images." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const auth = await requireAdmin(req, authContext, body);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { src, alt } = body;
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

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Add Lookbook Image Error:", error);
    return NextResponse.json({ error: error.message || "Failed to add image." }, { status: 500 });
  }
}
