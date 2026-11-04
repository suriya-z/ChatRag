'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmail, signUpWithEmail, signInWithSocial } from '@/lib/supabase-auth';
import { Github, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        const result = await signInWithEmail(email, password, rememberMe);
        if (result.error) {
          setError(result.error.message);
          return;
        }
        router.push('/');
        router.refresh();
      } else {
        const result = await signUpWithEmail(email, password);
        if (result.error) {
          setError(result.error.message);
          return;
        }
        setTimeout(() => {
          router.push('/auth/verify-email');
        }, 500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
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
          {/* Technical Telemetry Header */}
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#1a1c24]">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#94a3b8]">
                CHATRAG // ACCESS GATE
              </span>
            </div>
            <span className="font-mono text-[10px] text-[#64748b]">PORT 3000</span>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-xl font-bold tracking-tight text-white mb-1 font-sans">
              {isLogin ? 'AUTHENTICATE' : 'INITIALIZE ACCOUNT'}
            </h1>
            <p className="text-xs font-mono text-[#94a3b8] tracking-wide">
              {isLogin ? 'Provide credentials to enter ChatRAG workspace' : 'Create new verified operator account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-[10px] font-mono uppercase tracking-widest text-[#94a3b8] mb-1.5">
                EMAIL IDENTIFIER
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="h-10 w-full bg-[#11131a] border border-[#1a1c24] rounded-[4px] px-3 text-white text-sm font-mono placeholder:text-[#475569] focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] transition-colors"
                placeholder="operator@domain.corp"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-[10px] font-mono uppercase tracking-widest text-[#94a3b8]">
                  SECURITY KEY
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] font-mono text-[#64748b] hover:text-[#38bdf8] transition-colors uppercase tracking-wider"
                >
                  {showPassword ? '[ HIDE ]' : '[ SHOW ]'}
                </button>
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                className="h-10 w-full bg-[#11131a] border border-[#1a1c24] rounded-[4px] px-3 text-white text-sm font-mono placeholder:text-[#475569] focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] transition-colors"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2 pt-1 pb-1">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-3.5 w-3.5 rounded-[2px] bg-[#11131a] border-[#1a1c24] text-[#38bdf8] focus:ring-[#38bdf8] focus:ring-offset-0 cursor-pointer accent-[#38bdf8]"
              />
              <label htmlFor="remember-me" className="text-xs font-mono text-[#94a3b8] cursor-pointer tracking-wide">
                PERSIST SESSION // 14 DAYS
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-mono text-rose-400 bg-rose-950/20 border border-rose-900/40 p-2.5 rounded-[4px]"
              >
                [ERROR]: {error}
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 flex items-center justify-center bg-white text-black hover:bg-[#38bdf8] hover:text-black font-semibold rounded-[4px] text-xs font-mono uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>PROCESSING...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>{isLogin ? 'ENTER WORKSPACE' : 'REGISTER CREDENTIALS'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              )}
            </button>

            {/* Technical Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#1a1c24]" />
              </div>
              <div className="relative flex justify-center text-[10px] font-mono tracking-widest text-[#64748b]">
                <span className="bg-[#090a0f] px-3 uppercase">OR FEDERATED SSO</span>
              </div>
            </div>

            {/* Social Authentication */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  signInWithSocial('google').catch((err) =>
                    setError(err instanceof Error ? err.message : 'Google sign-in failed')
                  );
                }}
                className="h-10 flex items-center justify-center gap-2 rounded-[4px] bg-[#11131a] hover:bg-[#181b24] border border-[#1a1c24] hover:border-[#38bdf8] text-white transition-colors text-xs font-mono uppercase tracking-wider"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>GOOGLE</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setError('');
                  signInWithSocial('github').catch((err) =>
                    setError(err instanceof Error ? err.message : 'GitHub sign-in failed')
                  );
                }}
                className="h-10 flex items-center justify-center gap-2 rounded-[4px] bg-[#11131a] hover:bg-[#181b24] border border-[#1a1c24] hover:border-[#38bdf8] text-white transition-colors text-xs font-mono uppercase tracking-wider"
              >
                <Github className="h-4 w-4 text-white" />
                <span>GITHUB</span>
              </button>
            </div>

            {/* Toggle Login / Register */}
            <div className="text-center pt-4 border-t border-[#1a1c24]/60">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="text-xs font-mono text-[#94a3b8] hover:text-[#38bdf8] transition-colors uppercase tracking-wider"
              >
                {isLogin ? '[ NEW OPERATOR? REGISTER ACCOUNT ]' : '[ EXISTING OPERATOR? SIGN IN ]'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
