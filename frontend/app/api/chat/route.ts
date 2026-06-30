import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import {
  hasSupabaseConfig,
  getRequestSupabase,
  isTableMissingError,
  inMemoryServices,
  listBookingsInRange,
  adminSupabase,
  saveBooking,
} from '@/utils/supabaseServer';
import { sendBookingConfirmationEmail } from '@/utils/email';

const genAI = new GoogleGenAI({
  apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "",
});

function buildAIPrompt(servicesList: any[]) {
  const menServices = (servicesList || []).filter(s => s.category.toLowerCase() === 'men')
    .map((s, i) => `${i + 1}. ${s.name} ${s.duration} min - Rs. ${s.price}`).join('\n');
  const womenServices = (servicesList || []).filter(s => s.category.toLowerCase() === 'women')
    .map((s, i) => `${i + 1}. ${s.name} ${s.duration} min - Rs. ${s.price}`).join('\n');

  return `You are Bella, a sophisticated AI receptionist for a luxury salon in Sri Lanka. 
You ONLY handle salon-related queries. NEVER break character.
If asked about topics outside salon services (e.g., coding, politics, recipes, general facts), politely guide the conversation back to the salon.

IMPORTANT BOOKING RULES:
1. To book an appointment, you MUST output a JSON block wrapped in \`\`\`json ... \`\`\`.
2. The user must provide a CATEGORY (Men/Women), a SERVICE, a DATE, and a TIME before you output the JSON.
3. Once all details are gathered, output the final JSON in exactly this format WITHOUT asking if they want anything else:
\`\`\`json
{
  "book": true,
  "service": "[Exact Service Name]",
  "appointmentDate": "YYYY-MM-DD",
  "appointmentTime": "HH:MM AM/PM"
}
\`\`\`

Here is our exact price list in LKR. Use ONLY these services and amounts when booking:

MEN'S SERVICES:
${menServices}

WOMEN'S SERVICES:
${womenServices}

When asked about prices, always ask first if they are looking for Men's or Women's services, then show the corresponding list.
When outputting JSON, ensure the service name matches the list above perfectly.`;
}

function extractAppointmentDetails(message: string, history: any[], servicesList: any[]) {
  const userHistory = (history || []).filter((msg) => msg?.role === 'user');
  const fullConversation = [...userHistory.map((msg) => msg.text), message].join(" ");
  const lowerConversation = fullConversation.toLowerCase();
  const cleanMessage = String(message || '').trim();
  const cleanMessageLower = cleanMessage.toLowerCase();

  const details: any = {};

  if (servicesList && servicesList.length > 0) {
    for (const service of servicesList) {
      if (lowerConversation.includes(service.name.toLowerCase())) {
        details.service = `${service.name} ${service.duration} min (Rs. ${service.price})`;
        break;
      }
    }
  }

  const timeMatch = fullConversation.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
  if (timeMatch) {
    details.appointmentTime = timeMatch[0];
  }

  if (lowerConversation.includes("tomorrow")) {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    details.appointmentDate = tmrw.toISOString().split('T')[0];
  } else {
    details.appointmentDate = new Date().toISOString().split('T')[0];
  }

  const nameMatch = fullConversation.match(/(?:my name is|name is|name:\s*|i'm|i am|im|call me|this is)\s*([A-Za-z]+(?:\s+[A-Za-z]+){0,2})/i);
  if (nameMatch) {
    details.customerName = nameMatch[1].trim();
  } else {
    const plainNameMatch = cleanMessage.match(/^[A-Za-z]+(?:\s+[A-Za-z]+){0,2}$/);
    const commonNonNameTokens = new Set([
      'haircut', 'hair cut', 'trim', 'color', 'colour', 'coloring', 'book', 'booking', 'schedule',
      'yes', 'no', 'okay', 'ok', 'sure', 'tomorrow', 'today', 'tonight', 'morning', 'evening',
    ]);

    if (
      plainNameMatch &&
      cleanMessage.length >= 2 &&
      !commonNonNameTokens.has(cleanMessageLower)
    ) {
      details.customerName = cleanMessage;
    }
  }

  return details;
}

interface FallbackParams {
  shouldBook: boolean;
  appointmentDetails: any;
  bookingSaved: boolean;
  bookingError: string | null;
}

function buildFallbackChatReply({ shouldBook, appointmentDetails, bookingSaved, bookingError }: FallbackParams) {
  if (shouldBook && bookingSaved) {
    const service = appointmentDetails?.service || 'service';
    const name = appointmentDetails?.customerName || 'Guest';
    const date = appointmentDetails?.appointmentDate || new Date().toISOString().split('T')[0];
    return `Perfect, ${name}! Your ${service} appointment is booked for ${date}.`;
  }

  if (shouldBook && !appointmentDetails?.service) {
    return "I can book that for you—would you like Haircut & Styling, Color & Highlights, Keratin Treatment, or a Bridal Package?";
  }

  if (!appointmentDetails?.service) {
    return "Got it. Which service would you like to book: Haircut & Styling, Color & Highlights, Keratin Treatment, or a Bridal Package?";
  }

  if (!appointmentDetails?.customerName) {
    return `Great choice—${appointmentDetails.service}. May I have your name for the booking?`;
  }

  if (!shouldBook) {
    return `Thanks, ${appointmentDetails.customerName}. I have ${appointmentDetails.service}. Reply with "book" or "confirm" and I'll save your appointment for today.`;
  }

  if (shouldBook && bookingError) {
    return `I understood your booking request, but I couldn't save it right now (${bookingError}). Please try again in a moment.`;
  }

  return "I can help with bookings—tell me your service and name, then say confirm.";
}

export async function POST(req: Request) {
  try {
    const { message, history, userId, userEmail, accessToken } = await req.json();
    const safeMessage = typeof message === 'string' ? message.trim() : '';
    const safeHistory = Array.isArray(history)
      ? history.filter((msg) => msg && typeof msg.text === 'string' && typeof msg.role === 'string')
      : [];
    const safeUserId = typeof userId === 'string' ? userId.trim() : '';
    const safeUserEmail = typeof userEmail === 'string' ? userEmail.trim() : '';
    const safeAccessToken = typeof accessToken === 'string' ? accessToken.trim() : '';

    if (!safeMessage) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    let servicesList = inMemoryServices;
    const client = getRequestSupabase(safeAccessToken);
    if (client) {
      const { data, error } = await client.from('services').select('*').order('category', { ascending: false }).order('name', { ascending: true });
      if (!error || !isTableMissingError(error)) {
        servicesList = data || inMemoryServices;
      }
    }

    const appointmentDetails = extractAppointmentDetails(safeMessage, safeHistory, servicesList);

    const bookingKeywords = ["confirm", "book", "schedule", "yes", "okay", "sure", "perfect", "sounds good"];
    const userConversationText = [
      ...safeHistory.filter((msg) => msg.role === 'user').map((msg) => msg.text),
      safeMessage,
    ].join(' ').toLowerCase();
    const shouldBook = bookingKeywords.some((keyword) => userConversationText.includes(keyword));
    let bookingSaved = false;
    let bookingError = null;

    if (shouldBook && appointmentDetails.service) {
      if (!safeAccessToken || !safeUserId) {
        bookingError = 'Please log in to book an appointment.';
      } else if (!adminSupabase) {
        bookingError = 'Authentication service not configured.';
      } else {
        const { data: { user: bookingUser }, error: bookingAuthErr } = await adminSupabase.auth.getUser(safeAccessToken);
        if (bookingAuthErr || !bookingUser || bookingUser.id !== safeUserId) {
          bookingError = 'Please log in to book an appointment.';
        }
      }

      if (!bookingError) {
        try {
          let dateTimeString = appointmentDetails.appointmentDate || new Date().toISOString().split('T')[0];
          if (appointmentDetails.appointmentTime) {
            try {
              const strTime = appointmentDetails.appointmentTime.toLowerCase();
              const timeMatch = strTime.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
              let hours = timeMatch ? parseInt(timeMatch[1]) : 12;
              let mins = timeMatch && timeMatch[2] ? timeMatch[2] : '00';
              let meridiem = timeMatch && timeMatch[3] ? timeMatch[3] : '';

              if (meridiem === 'pm' && hours < 12) hours += 12;
              if (meridiem === 'am' && hours === 12) hours = 0;

              const hh = String(hours).padStart(2, '0');
              const mm = String(mins).padStart(2, '0');
              dateTimeString = `${dateTimeString}T${hh}:${mm}:00`;
            } catch (e) {
              dateTimeString = `${dateTimeString}T12:00:00`;
            }
          } else {
            dateTimeString = `${dateTimeString}T12:00:00`;
          }

          const appointmentISO = new Date(dateTimeString).toISOString();
          const start = new Date(appointmentISO);
          const durationMatch = appointmentDetails.service.match(/(\d+)\s*min/);
          const duration = durationMatch ? parseInt(durationMatch[1]) : 60;
          const end = new Date(start.getTime() + duration * 60000);

          const windowStart = new Date(start.getTime() - 12 * 60 * 60 * 1000).toISOString();
          const windowEnd = new Date(start.getTime() + 12 * 60 * 60 * 1000).toISOString();

          const existingBookings = await listBookingsInRange(windowStart, windowEnd, safeAccessToken);

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
            bookingError = "This time slot is already booked. Please choose another time.";
          } else {
            const bookingData: any = {
              customer_name: appointmentDetails.customerName || "Guest",
              service: appointmentDetails.service,
              appointment_date: appointmentISO,
            };

            if (safeUserId) {
              bookingData.user_id = safeUserId;
            }
            if (safeUserEmail) {
              bookingData.user_email = safeUserEmail;
            }

            console.log("Saving appointment to Supabase:", bookingData);

            const { data, error } = await saveBooking(bookingData, safeAccessToken);

            if (error) {
              console.error("Supabase error:", error);
              bookingError = error.message || 'database error';
            } else {
              console.log("Appointment saved successfully:", data);
              bookingSaved = true;

              if (safeUserEmail) {
                sendBookingConfirmationEmail({
                  to: safeUserEmail,
                  name: bookingData.customer_name,
                  service: bookingData.service,
                  appointmentDate: bookingData.appointment_date,
                }).catch((err) => console.error('Email send error:', err));
              }
            }
          }
        } catch (dbError: any) {
          console.error("Database error:", dbError);
          bookingError = dbError instanceof Error ? dbError.message : 'database error';
        }
      }
    } else {
      console.log("Booking conditions not met:", { shouldBook, service: appointmentDetails.service, message: safeMessage });
    }

    const fallbackText = buildFallbackChatReply({
      shouldBook,
      appointmentDetails,
      bookingSaved,
      bookingError,
    });

    let responseText = fallbackText;

    const contents: any[] = safeHistory.length > 0
      ? [
        ...safeHistory.map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        })),
        {
          role: "user",
          parts: [{ text: safeMessage }],
        },
      ]
      : [{ role: "user", parts: [{ text: safeMessage }] }];

    if (shouldBook && bookingSaved) {
      contents.push({
        role: "user",
        parts: [{ text: "SYSTEM MESSAGE: The booking was successfully saved to the database. Let the user know." }]
      });
    } else if (shouldBook && bookingError) {
      contents.push({
        role: "user",
        parts: [{ text: `SYSTEM MESSAGE: The booking failed due to an error: ${bookingError}. Apologize to the user.` }]
      });
    }

    if (process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY) {
      try {
        const result = await genAI.models.generateContent({
          model: "gemini-2.5-flash",
          contents: contents,
          config: {
            systemInstruction: buildAIPrompt(servicesList),
          },
        });

        if (result?.text) {
          responseText = result.text;
        }
      } catch (geminiError) {
        console.error("Gemini API Error:", geminiError);
      }
    } else {
      console.warn("Gemini API key not configured; using fallback chat reply.");
    }

    return NextResponse.json({
      text: responseText,
      appointmentDetails: shouldBook ? appointmentDetails : null,
      bookingSaved,
      bookingError,
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
