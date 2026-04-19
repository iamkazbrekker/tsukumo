'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    otp: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const requestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');

      // Expose debug url in dev mode to console
      if (data.debugUrl) {
        console.log("TESTING OTP LINK:", data.debugUrl);
      }
      
      if (data.devOtp) {
        alert(`[DEV MODE] Bypass Email! Your OTP Code is: ${data.devOtp}`);
        // Optionally, we could even auto-fill it:
        // setFormData(prev => ({ ...prev, otp: data.devOtp }));
      }

      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          otp: formData.otp
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid OTP');

      // OTP verified successfully
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
      setLoading(false); // we keep loading state if successful since we're routing
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute inset-x-0 top-0 h-[500px] bg-gradient-to-b from-[#b37f44]/20 to-transparent pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#d4af37]/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-md p-8 bg-zinc-900/40 backdrop-blur-xl border border-[#b37f44]/30 rounded-2xl shadow-[0_0_40px_rgba(212,175,55,0.1)]">
        
        <div className="text-center mb-8">
           <h1 className="text-4xl font-light text-[#d4af37] tracking-wider uppercase drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]">
             Tsukumo
           </h1>
           <p className="text-zinc-400 mt-2 text-sm tracking-wide">
             Secure Access Portal
           </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded bg-red-500/10 border border-red-500/50 text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={requestOTP} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-1 ml-1" htmlFor="username">
                Username
              </label>
              <input 
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                className="w-full bg-black/50 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#d4af37]/50 focus:ring-1 focus:ring-[#d4af37]/50 transition-all"
                placeholder="Kaz Brekker"
              />
            </div>
            
            <div>
              <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-1 ml-1" htmlFor="email">
                Real Email
              </label>
              <input 
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-black/50 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#d4af37]/50 focus:ring-1 focus:ring-[#d4af37]/50 transition-all"
                placeholder="kaz@ketterdam.com"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-1 ml-1" htmlFor="password">
                Password
              </label>
              <input 
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-black/50 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#d4af37]/50 focus:ring-1 focus:ring-[#d4af37]/50 transition-all"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-4 bg-gradient-to-r from-[#8a6132] to-[#b37f44] hover:from-[#b37f44] hover:to-[#d4af37] text-white font-medium py-3 rounded-lg shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Request Verification Code'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOTP} className="space-y-5 animate-in fade-in slide-in-from-right-8 duration-500">
            
            <div className="text-center mb-6">
              <p className="text-sm text-zinc-400">
                An OTP has been sent to <br/>
                <span className="text-[#d4af37] font-medium">{formData.email}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-1 ml-1 text-center" htmlFor="otp">
                Enter 6-digit Code
              </label>
              <input 
                id="otp"
                name="otp"
                type="text"
                required
                maxLength={6}
                value={formData.otp}
                onChange={handleChange}
                className="w-full bg-black/50 border border-zinc-800 rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] text-[#d4af37] placeholder-zinc-700 focus:outline-none focus:border-[#d4af37]/50 focus:ring-1 focus:ring-[#d4af37]/50 transition-all"
                placeholder="••••••"
              />
              <p className="text-xs text-zinc-500 text-center mt-2">
                Check your console for the temporary Ethereal link if you are developing without real SMTP.
              </p>
            </div>

            <button 
              type="submit" 
              disabled={loading || formData.otp.length < 6}
              className="w-full mt-4 bg-gradient-to-r from-[#d4af37] to-[#eadd87] hover:brightness-110 text-black font-semibold py-3 rounded-lg shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
               {loading ? (
                <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                'Verify & Enter'
              )}
            </button>

            <button 
              type="button" 
              onClick={() => setStep(1)}
              className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors mt-4"
            >
              Back to Start
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
