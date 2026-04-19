const checkHealth = async () => {
  try {
    // 1. Visit root to check if Page loads
    const res = await fetch('http://localhost:3000');
    if (!res.ok) throw new Error(`Root page failed: ${res.status}`);
    const text = await res.text();
    if (!text.includes('Secure Access Portal')) {
      throw new Error('Login page content not found');
    }
    console.log('✅ Next.js Root Login Route verified');

    // 2. Test send-otp route
    const otpRes = await fetch('http://localhost:3000/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', username: 'TestUser' }),
    });
    const otpData = await otpRes.json();
    if (!otpData.success) throw new Error('Send OTP failed: ' + JSON.stringify(otpData));
    console.log('✅ Send OTP API verified');

    // Check middleware protection
    const dashRes = await fetch('http://localhost:3000/dashboard', { redirect: 'manual' });
    if (dashRes.status === 307 || dashRes.status === 308) {
      console.log('✅ Middleware correctly redirects unauthenticated user');
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
};

checkHealth();
