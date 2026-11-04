'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { env } from '@/lib/env';
import { Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <div className="flex items-center justify-center min-h-screen w-full bg-[#000000] p-4 select-none relative">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="bg-[#090a0f] border border-[#1a1c24] rounded-[4px] shadow-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#1a1c24]">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#94a3b8]">
                CHATRAG // REGISTRATION GATE
              </span>
            </div>
            {plan && (
              <span className="font-mono text-[10px] text-[#38bdf8] border border-[#38bdf8]/40 px-2 py-0.5 rounded-[2px] uppercase">
                TIER: {plan}
              </span>
            )}
          </div>

          <div className="mb-6">
            <h1 className="text-xl font-bold tracking-tight text-white mb-1 font-sans">
              COMPLETE REGISTRATION
            </h1>
            <p className="text-xs font-mono text-[#94a3b8] tracking-wide">
              {plan ? `Provision workspace with ${plan.toUpperCase()} tier privileges` : 'Provision new verified operator workspace'}
            </p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[10px] font-mono uppercase tracking-widest text-[#94a3b8] mb-1.5">
                EMAIL IDENTIFIER
              </label>
              <input
                id="email"
                type="email"
                required
                className="h-10 w-full bg-[#11131a] border border-[#1a1c24] rounded-[4px] px-3 text-white text-sm font-mono placeholder:text-[#475569] focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] transition-colors"
                placeholder="operator@domain.corp"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] font-mono uppercase tracking-widest text-[#94a3b8] mb-1.5">
                SECURITY KEY
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                className="h-10 w-full bg-[#11131a] border border-[#1a1c24] rounded-[4px] px-3 text-white text-sm font-mono placeholder:text-[#475569] focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] transition-colors"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-mono text-rose-400 bg-rose-950/20 border border-rose-900/40 p-2.5 rounded-[4px]"
              >
                [ERROR]: {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 flex items-center justify-center bg-white text-black hover:bg-[#38bdf8] hover:text-black font-semibold rounded-[4px] text-xs font-mono uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>PROVISIONING...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>CONFIRM & INITIALIZE</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              )}
            </button>

            <div className="text-center pt-4 border-t border-[#1a1c24]/60">
              <button
                type="button"
                onClick={() => router.push('/auth')}
                className="text-xs font-mono text-[#94a3b8] hover:text-[#38bdf8] transition-colors uppercase tracking-wider"
              >
                [ RETURN TO AUTHENTICATION GATE ]
              </button>
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
      <div className="min-h-screen w-full bg-[#000000] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#38bdf8]" />
      </div>
    }>
      <SignUpContent />
    </Suspense>
  );
}
