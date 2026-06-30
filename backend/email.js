import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function formatAppointmentDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Colombo',
  });
}

function getServiceDuration(service) {
  const match = service?.match(/(\d+)\s*min/i);
  return match ? `${match[1]} minutes` : '60 minutes';
}

// 1. Updated template to use a secure Content-ID (cid:) tracking handle for the logo
function buildBookingEmailHtml({ name, service, appointmentDate, siteUrl }) {
  const formattedDate = formatAppointmentDate(appointmentDate);
  const duration = getServiceDuration(service);
  const bookingsUrl = `${siteUrl.replace(/\/$/, '')}/bookings`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Booking Confirmation</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0A0A0A;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#141414;border:1px solid #2A2A2A;border-radius:16px;overflow:hidden;">
          <tr>
            <td align="center" style="padding:32px 24px 16px;">
              <img src="cid:royal-glow-logo" alt="Royal Glow Salon" width="80" height="80" style="display:block;margin:0 auto 12px;" />
              <p style="margin:0;color:#E8B88A;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;">Royal Glow Salon</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 24px;text-align:center;">
              <h1 style="margin:0 0 8px;color:#FFFFFF;font-size:24px;font-weight:400;">Appointment Confirmed</h1>
              <p style="margin:0;color:#A8A29E;font-size:14px;line-height:1.6;">Hi ${name}, your visit is booked. We look forward to seeing you.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#1A1A1A;border:1px solid #2A2A2A;border-radius:12px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 16px;color:#E8B88A;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;">Booking Details</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding:8px 0;color:#78716C;font-size:12px;width:90px;vertical-align:top;">Name</td>
                        <td style="padding:8px 0;color:#FFFFFF;font-size:14px;">${name}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#78716C;font-size:12px;vertical-align:top;">Service</td>
                        <td style="padding:8px 0;color:#FFFFFF;font-size:14px;">${service}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#78716C;font-size:12px;vertical-align:top;">Date &amp; Time</td>
                        <td style="padding:8px 0;color:#FFFFFF;font-size:14px;">${formattedDate}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#78716C;font-size:12px;vertical-align:top;">Duration</td>
                        <td style="padding:8px 0;color:#FFFFFF;font-size:14px;">${duration}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#78716C;font-size:12px;vertical-align:top;">Location</td>
                        <td style="padding:8px 0;color:#FFFFFF;font-size:14px;">Beach Road, Matara, Sri Lanka</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 24px 24px;">
              <a href="${bookingsUrl}" style="display:inline-block;background-color:#E8B88A;color:#0A0A0A;text-decoration:none;font-size:12px;font-weight:bold;letter-spacing:0.15em;text-transform:uppercase;padding:14px 28px;border-radius:999px;">View My Bookings</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 32px;text-align:center;">
              <p style="margin:0 0 4px;color:#78716C;font-size:12px;">Questions? Call +94 41 222 3456 or email royalglow@gmail.com</p>
              <p style="margin:0;color:#57534E;font-size:11px;">Open daily 9 AM – 8 PM</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
}

export async function sendBookingConfirmationEmail({ to, name, service, appointmentDate }) {
  if (!to) return { sent: false, reason: 'no_recipient' };

  const transporter = createTransporter();
  if (!transporter) return { sent: false, reason: 'smtp_not_configured' };

  const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
  const from = `"Royal Glow Salon" <${process.env.SMTP_USER}>`; // Safely falls back to verified auth email
  const formattedDate = formatAppointmentDate(appointmentDate);

  const html = buildBookingEmailHtml({ name, service, appointmentDate, siteUrl });

  const text = [
    'Royal Glow Salon — Appointment Confirmed',
    '',
    `Hi ${name},`,
    '',
    'Your appointment has been booked successfully.',
    '',
    `Service: ${service}`,
    `Date & Time: ${formattedDate}`,
    `Duration: ${getServiceDuration(service)}`,
    'Location: Beach Road, Matara, Sri Lanka',
    '',
    `View bookings: ${siteUrl.replace(/\/$/, '')}/bookings`,
    '',
    'Questions? +94 41 222 3456 | royalglow@gmail.com',
  ].join('\n');

  // 2. Resolve image path cleanly to attach it as a proper transactional element
  const logoPath = path.join(__dirname, '../frontend/public/wite.png');
  const attachments = [];

  if (fs.existsSync(logoPath)) {
    attachments.push({
      filename: 'logo.png',
      path: logoPath,
      cid: 'royal-glow-logo' // Must exactly match the HTML src attribute "cid:royal-glow-logo"
    });
  }

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `Royal Glow — Appointment Confirmed: ${service}`,
      text,
      html,
      attachments, // Attached via official system channels rather than string blobs
    });
    console.log(`Booking confirmation email sent to ${to}`);
    return { sent: true };
  } catch (error) {
    console.error('Failed to send booking confirmation email:', error);
    return { sent: false, reason: 'send_failed', error: error.message };
  }
}