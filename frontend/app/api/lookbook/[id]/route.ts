import { NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import {
  authContext,
  getAdminDbClient,
} from '@/utils/supabaseServer';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireAdmin(req, authContext);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const client = getAdminDbClient(auth);

    if (!client) {
      throw new Error("Supabase client not initialized.");
    }

    const { error } = await client
      .from('lookbook')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Lookbook Image Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete image." }, { status: 500 });
  }
}
