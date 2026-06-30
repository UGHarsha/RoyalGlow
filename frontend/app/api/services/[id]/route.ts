import { NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import {
  authContext,
  getAdminDbClient,
} from '@/utils/supabaseServer';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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
      .update({ name: finalName, category, price, duration })
      .eq('id', id)
      .select();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Update Service Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update service." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // For DELETE request, token needs to be passed via Authorization header or search params
    const auth = await requireAdmin(req, authContext);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const client = getAdminDbClient(auth);

    if (!client) {
      throw new Error("Supabase client not initialized.");
    }

    const { error } = await client
      .from('services')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Service Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete service." }, { status: 500 });
  }
}
