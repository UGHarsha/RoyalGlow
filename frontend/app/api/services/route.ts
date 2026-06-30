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
      .from('services')
      .select('*')
      .order('category', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    const mappedData = (data || []).map((s: any) => {
      if (s.name && s.name.includes('|||')) {
        const [realName, desc] = s.name.split('|||');
        return { ...s, name: realName, description: desc };
      }
      return s;
    });

    return NextResponse.json(mappedData);
  } catch (error) {
    console.error("Fetch Services Error:", error);
    return NextResponse.json({ error: "Failed to fetch services." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const auth = await requireAdmin(req, authContext, body);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { name, category, price, duration, description } = body;
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

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Add Service Error:", error);
    return NextResponse.json({ error: error.message || "Failed to add service." }, { status: 500 });
  }
}
