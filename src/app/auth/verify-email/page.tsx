'use client';

import { Mail, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function VerifyEmailPage() {
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
        <div className="relative rounded-2xl bg-[#0f1015]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_24px_60px_-12px_rgba(0,0,0,0.85)] p-8 sm:p-9 text-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.35 }}
            className="flex justify-center mb-5"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-[#38bdf8]/15 to-transparent border border-[#38bdf8]/30 flex items-center justify-center shadow-[0_4px_24px_rgba(56,189,248,0.25)]">
              <Mail className="w-6 h-6 text-[#38bdf8]" />
            </div>
          </motion.div>

          <h1 className="text-2xl font-semibold tracking-tight text-white mb-2 font-sans">
            Check your email
          </h1>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed max-w-[320px] mx-auto">
            We sent a verification link to your email address. Click the link to complete your sign-up.
          </p>

          <div className="pt-2 border-t border-white/[0.06]">
            <Link
              href="/auth"
              className="inline-flex items-center justify-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors py-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to sign in</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
