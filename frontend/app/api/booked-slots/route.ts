import { NextResponse } from 'next/server';
import { listBookingsInRange } from '@/utils/supabaseServer';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const targetDate = new Date(date);
    const windowStart = new Date(targetDate.getTime() - 12 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(targetDate.getTime() + 36 * 60 * 60 * 1000).toISOString();

    const data = await listBookingsInRange(windowStart, windowEnd, null);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Fetch Booked Slots Error:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}
