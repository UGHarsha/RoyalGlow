import { NextResponse } from 'next/server';
import { requireAuth } from '@/utils/auth';
import {
  authContext,
  listBookingsInRange,
  saveBooking,
} from '@/utils/supabaseServer';
import { sendBookingConfirmationEmail } from '@/utils/email';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const auth = await requireAuth(req, authContext, body);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { name, service, date, userId, userEmail, accessToken } = body;

    if (!name || !service || !date) {
      return NextResponse.json({ error: "Missing required fields: name, service, or date." }, { status: 400 });
    }

    if (userId && userId !== auth.user.id) {
      return NextResponse.json({ error: 'User ID does not match authenticated session.' }, { status: 403 });
    }

    const resolvedUserId = auth.user.id;
    const resolvedUserEmail = userEmail || auth.user.email;
    const resolvedAccessToken = accessToken || auth.accessToken;

    const start = new Date(date);
    const durationMatch = service.match(/(\d+)\s*min/);
    const duration = durationMatch ? parseInt(durationMatch[1]) : 60;
    const end = new Date(start.getTime() + duration * 60000);

    const windowStart = new Date(start.getTime() - 12 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(start.getTime() + 12 * 60 * 60 * 1000).toISOString();

    const existingBookings = await listBookingsInRange(windowStart, windowEnd, resolvedAccessToken);

    let isOverlapping = false;
    for (const booking of (existingBookings || [])) {
      const bStart = new Date(booking.appointment_date);
      const bDurMatch = booking.service ? booking.service.match(/(\d+)\s*min/) : null;
      const bDur = bDurMatch ? parseInt(bDurMatch[1]) : 60;
      const bEnd = new Date(bStart.getTime() + bDur * 60000);

      if (Math.max(start.getTime(), bStart.getTime()) < Math.min(end.getTime(), bEnd.getTime())) {
        isOverlapping = true;
        break;
      }
    }

    if (isOverlapping) {
      return NextResponse.json({ error: "This time slot is already booked. Please choose another time." }, { status: 409 });
    }

    const bookingData: any = {
      customer_name: name,
      service: service,
      appointment_date: date,
    };

    if (resolvedUserId) {
      bookingData.user_id = resolvedUserId;
    }
    if (resolvedUserEmail) {
      bookingData.user_email = resolvedUserEmail;
    }

    const { data, error } = await saveBooking(bookingData, resolvedAccessToken);

    if (error) {
      return NextResponse.json({ error: error.message || 'database error' }, { status: 500 });
    }

    if (resolvedUserEmail) {
      sendBookingConfirmationEmail({
        to: resolvedUserEmail,
        name,
        service,
        appointmentDate: date,
      }).catch((err) => console.error('Email send error:', err));
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Manual Booking Error:", error);
    return NextResponse.json({ error: "Failed to book appointment." }, { status: 500 });
  }
}
