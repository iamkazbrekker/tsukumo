import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { to, subject, text, ics_data } = await request.json();

    const payload: any = {
      from: 'Tsukumo Autonomous Agent <onboarding@resend.dev>',
      to: to || 'kazbrekker898@gmail.com',
      subject: subject,
      text: text,
    };

    if (ics_data) {
      payload.attachments = [
        {
          filename: 'appointment.ics',
          content: Buffer.from(ics_data).toString('base64'),
          content_type: 'text/calendar',
        },
      ];
    }

    const { data, error } = await resend.emails.send(payload);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
