'use client';

import { Mail, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function VerifyEmailPage() {
  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-[#000000] p-4 select-none relative">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="bg-[#090a0f] border border-[#1a1c24] rounded-[4px] shadow-2xl p-6 sm:p-8">
          {/* Technical Telemetry Header */}
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#1a1c24]">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#94a3b8]">
                CHATRAG // VERIFICATION DISPATCH
              </span>
            </div>
            <span className="font-mono text-[10px] text-[#10b981]">DISPATCHED</span>
          </div>

          {/* Icon Badge */}
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-[4px] bg-[#11131a] border border-[#1a1c24] flex items-center justify-center text-[#38bdf8]">
              <Mail className="w-6 h-6" />
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold tracking-tight text-white mb-2 font-sans">
              CONFIRMATION TRANSMITTED
            </h1>
            <p className="text-xs font-mono text-[#94a3b8] tracking-wide max-w-[40ch] mx-auto">
              A cryptographically signed verification link has been dispatched to your email endpoint.
            </p>
          </div>

          {/* Technical instruction box */}
          <div className="bg-[#11131a] border border-[#1a1c24] rounded-[4px] p-4 mb-6 text-xs font-mono text-[#cbd5e1] leading-relaxed">
            <div className="text-[10px] text-[#64748b] uppercase tracking-wider mb-1">[ INSTRUCTION ]</div>
            Open the link in your inbox to complete identity verification and activate the ChatRAG vector engine.
          </div>

          {/* Return link */}
          <div className="pt-2 border-t border-[#1a1c24]/60">
            <Link
              href="/auth"
              className="w-full h-10 flex items-center justify-center gap-2 rounded-[4px] bg-white text-black hover:bg-[#38bdf8] hover:text-black font-semibold text-xs font-mono uppercase tracking-wider transition-colors"
            >
              <span>RETURN TO AUTHENTICATE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
