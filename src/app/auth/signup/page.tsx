'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { env } from '@/lib/env';
import { Loader2, Sparkles, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

function SignUpContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  const plan = searchParams.get('plan');
  const checkoutId = searchParams.get('checkout_id');

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const customSmtpEnabled = env.NEXT_PUBLIC_CUSTOM_SMTP_ENABLED === 'true';
      const options = {
        ...(customSmtpEnabled ? {
          emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        } : {}),
        data: {
          plan_type: plan,
          checkout_id: checkoutId,
        },
      };

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options,
      });

      if (signUpError) throw signUpError;
      router.push('/auth/verify-email');
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen w-full bg-[#070709] px-4 py-12 overflow-hidden select-none">
      <div 
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[480px] rounded-full opacity-35 blur-[120px]"
        style={{
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, rgba(120, 119, 198, 0.15) 50%, transparent 80%)'
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] z-10"
      >
        <div className="relative rounded-2xl bg-[#0f1015]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_24px_60px_-12px_rgba(0,0,0,0.85)] p-8 sm:p-9">
          <div className="flex flex-col items-center text-center mb-7">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-white/[0.12] to-white/[0.03] border border-white/[0.12] flex items-center justify-center shadow-[0_4px_20px_rgba(56,189,248,0.2)] mb-4">
              <Sparkles className="w-5 h-5 text-[#38bdf8]" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white mb-1.5 font-sans">
              Create an account
            </h1>
            <p className="text-sm text-zinc-400">
              {plan ? `Complete your ${plan} registration` : 'Join ChatRAG to start chatting'}
            </p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-medium text-zinc-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                className="h-11 w-full bg-zinc-900/60 border border-zinc-800/80 rounded-lg px-3.5 text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-2 focus:ring-[#38bdf8]/15 transition-all"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-medium text-zinc-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                className="h-11 w-full bg-zinc-900/60 border border-zinc-800/80 rounded-lg px-3.5 text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-2 focus:ring-[#38bdf8]/15 transition-all"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-rose-300 bg-rose-950/30 border border-rose-800/40 p-3 rounded-lg text-center"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.985 }}
              className="w-full h-11 flex items-center justify-center bg-white text-zinc-950 hover:bg-zinc-100 active:bg-zinc-200 font-medium rounded-lg text-sm transition-all shadow-[0_1px_2px_rgba(0,0,0,0.2)] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                  <span>Creating account...</span>
                </div>
              ) : (
                <span>Continue</span>
              )}
            </motion.button>

            <div className="text-center pt-5 border-t border-white/[0.06]">
              <Link
                href="/auth"
                className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to sign in</span>
              </Link>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default function SignUp() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full bg-[#070709] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#38bdf8]" />
      </div>
    }>
      <SignUpContent />
    </Suspense>
  );
}
