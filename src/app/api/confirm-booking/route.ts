import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Only instantiate resend if the API key is present
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { email, ...bookingDetails } = data;

    // 1. Forward to FastAPI backend strictly for booking
    const mlResponse = await fetch('http://127.0.0.1:8000/confirm-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingDetails),
    });

    if (!mlResponse.ok) {
      throw new Error(`FastAPI backend failed: ${mlResponse.statusText}`);
    }

    const finalBookingData = await mlResponse.json();

    // 2. Transact Email via Resend if email is provided
    if (email) {
      if (!resend) {
        console.warn('RESEND_API_KEY is not defined in .env.local. Email dispatch bypassed in development.');
      } else {
        try {
          const { data: emailData, error } = await resend.emails.send({
            from: 'Tsukumo Autonomous Care <onboarding@resend.dev>', // resend's default test sender
            to: email, // Resend free tier strict requires this to be your registered domain/email unless verified
            subject: `Tsukumo: Appointment Confirmed (${finalBookingData.booking_id})`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 24px; color: #1c1917; background-color: #fafaf9;">
                <div style="max-w-2xl mx-auto bg-white border border-yellow-900/20 rounded-2xl p-8 shadow-lg">
                  <h2 style="color: #d97706; border-bottom: 2px solid #fef3c7; padding-bottom: 12px; margin-bottom: 24px;">Appointment Harmonized</h2>
                  <p>Greetings,</p>
                  <p>Your Health Twin and the Tsukumo Autonomous Care system have successfully scheduled your consultation.</p>
                  
                  <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin: 24px 0;">
                    <p style="margin: 0 0 8px 0;"><strong>Booking ID:</strong> ${finalBookingData.booking_id}</p>
                    <p style="margin: 0 0 8px 0;"><strong>Healer:</strong> ${finalBookingData.healer_name}</p>
                    <p style="margin: 0 0 8px 0;"><strong>Specialty:</strong> ${finalBookingData.specialty}</p>
                    <p style="margin: 0 0 8px 0;"><strong>Urgency:</strong> ${finalBookingData.urgency}</p>
                    <p style="margin: 0;"><strong>Time:</strong> ${new Date(finalBookingData.time).toLocaleString()}</p>
                  </div>
                  
                  <p style="font-style: italic; color: #78716c;">Agentic Reason: ${finalBookingData.context}</p>
                  ${finalBookingData.report ? `
                    <div style="background-color: #1c1917; color: #e7e5e4; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; margin-top: 16px;">
                      ${finalBookingData.report}
                    </div>
                  ` : ''}
                  
                  <p style="margin-top: 32px; color: #a8a29e; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; text-align: center;">Tsukumo Cognitive Health Twin</p>
                </div>
              </div>
            `,
          });

          if (error) {
             console.error("Resend API responded with an error:", error);
          } else {
             console.log("Resend API successfully dispatched email:", emailData?.id);
          }
        } catch (mailError) {
          console.error("Failed to map Resend API request:", mailError);
        }
      }
    }

    return NextResponse.json(finalBookingData);

  } catch (error: any) {
    console.error('Confirm Booking Proxy Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
