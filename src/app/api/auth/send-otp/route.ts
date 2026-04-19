import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// In-memory cache to store OTPs. 
// Format: { 'email': { otp: '123456', expiresAt: 1234567890 } }
// Note: In production with multiple server instances, use Redis or a DB.
const otpCache = new Map<string, { otp: string, expiresAt: number }>();

// Export OTP cache for verify route (Note: this works in 'nodejs' runtime if it's the same bundle. 
// For Next.js App Router, global variables on `globalThis` are safer across HMR in dev).
declare global {
  var _otpCache: Map<string, { otp: string, expiresAt: number }> | undefined;
}

if (!globalThis._otpCache) {
  globalThis._otpCache = otpCache;
}
const cache = globalThis._otpCache;

export async function POST(req: Request) {
  try {
    const { email, username } = await req.json();

    if (!email || !username) {
      return NextResponse.json({ error: 'Email and username are required' }, { status: 400 });
    }

    // Generate a secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store in cache
    cache.set(email, { otp, expiresAt });

    // Set up email transport
    // Using environment variables or fallback to ethereal test account
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Send email
    // Send email - wrapped in try/catch so it doesn't fail the whole request if credentials are bad
    let info = null;
    try {
      info = await transporter.sendMail({
        from: '"Tsukumo Secure" <noreply@tsukumo-system.com>',
        to: email,
        subject: 'Your Tsukumo OTP Code for Login',
        text: `Hello ${username},\n\nYour One-Time Password for login is: ${otp}\n\nIt is valid for 5 minutes. Do not share this code with anyone.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #4a90e2;">Tsukumo Verification</h2>
            <p>Hello <strong>${username}</strong>,</p>
            <p>Your One-Time Password for login is:</p>
            <h1 style="background: #f4f4f4; padding: 10px; border-radius: 5px; text-align: center; font-spacing: 5px; letter-spacing: 5px;">${otp}</h1>
            <p>It is valid for 5 minutes. Do not share this code with anyone.</p>
          </div>
        `,
      });
    } catch (mailError) {
      console.warn("Could not send email, but continuing because we are in development:", mailError);
    }

    // Provide the ethereal test URL in development if available
    const previewUrl = info ? nodemailer.getTestMessageUrl(info) : null;
    if (previewUrl) {
      console.log('OTP preview URL:', previewUrl);
    }

    return NextResponse.json({
      success: true,
      message: 'OTP generated successfully',
      debugUrl: previewUrl, // Expose for testing so user can click it
      devOtp: process.env.NODE_ENV === 'development' ? otp : undefined // Return OTP so frontend can show it directly
    });

  } catch (error: any) {
    console.error('Send OTP Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
