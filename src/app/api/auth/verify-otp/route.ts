import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// In Next.js dev server, global caching ensures it survives HMR
const cache = globalThis._otpCache || new Map();

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    const record = cache.get(email);

    if (!record) {
      return NextResponse.json({ error: 'No OTP found or it has expired' }, { status: 400 });
    }

    if (Date.now() > record.expiresAt) {
      cache.delete(email); // Clean up
      return NextResponse.json({ error: 'OTP has expired' }, { status: 400 });
    }

    if (record.otp !== otp.toString().trim()) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    // Success! Clear the OTP from cache
    cache.delete(email);

    // Set an authorization cookie (simple for MVP)
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'tsukumo_auth',
      value: `authenticated_${email}`,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    return NextResponse.json({
      success: true,
      message: 'Login successful'
    });

  } catch (error: any) {
    console.error('Verify OTP Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
