'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmail, signUpWithEmail, signInWithSocial } from '@/lib/supabase-auth';
import { Github, Loader2, Sparkles, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
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
        }, 400);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen w-full bg-[#070709] px-4 py-12 overflow-hidden select-none">
      {/* Ambient background illumination */}
      <div 
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[480px] rounded-full opacity-35 blur-[120px]"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.04) 0%, rgba(39, 39, 42, 0.15) 50%, transparent 80%)'
        }}
      />
      <div 
        className="pointer-events-none absolute -bottom-40 right-1/4 w-[480px] h-[360px] rounded-full opacity-20 blur-[100px]"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.02) 0%, transparent 70%)'
        }}
      />

      {/* Subtle background grid pattern */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] z-10"
      >
        <div className="relative rounded-2xl bg-[#0b0c10]/95 backdrop-blur-2xl border border-white/[0.08] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.02)] p-8 sm:p-9">
          
          {/* Hermes Agent Badge & Icon */}
          <div className="flex flex-col items-center text-center mb-7">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative mb-5"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-b from-zinc-800/90 to-zinc-950 border border-white/[0.12] flex items-center justify-center shadow-[0_12px_28px_-8px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.15)]">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <circle cx="12" cy="12" r="3" fill="currentColor" />
                  <path d="M12 2v3m0 14v3M2 12h3m14 0h3" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="8" strokeOpacity="0.4" strokeDasharray="3 3" />
                </svg>
              </div>
            </motion.div>

            <h1 className="text-2xl font-semibold tracking-tight text-white mb-1.5 font-sans">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h1>
            <p className="text-sm text-zinc-400 max-w-[280px]">
              {isLogin ? 'Sign in to your intelligence workspace' : 'Create your intelligence workspace'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-medium text-zinc-300">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="h-11 w-full bg-zinc-900/60 border border-zinc-800/80 rounded-lg px-3.5 text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-white/20 focus:border-zinc-400 transition-all"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-medium text-zinc-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Show</span>
                    </>
                  )}
                </button>
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                className="h-11 w-full bg-zinc-900/60 border border-zinc-800/80 rounded-lg px-3.5 text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-white/20 focus:border-zinc-400 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded bg-zinc-900 border-zinc-700 text-white focus:ring-1 focus:ring-white/20 cursor-pointer accent-white"
                />
                <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">
                  Remember me
                </span>
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-rose-300 bg-rose-950/30 border border-rose-800/40 p-3 rounded-lg text-center"
              >
                {error}
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.985 }}
              className="w-full h-11 flex items-center justify-center bg-white text-zinc-950 hover:bg-zinc-100 active:bg-zinc-200 font-medium rounded-lg text-sm transition-all shadow-[0_1px_2px_rgba(0,0,0,0.2)] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                  <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
                </div>
              ) : (
                <span>{isLogin ? 'Sign in' : 'Create account'}</span>
              )}
            </motion.button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.08]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#0f1015] px-3 text-zinc-500 font-normal">
                  or continue with
                </span>
              </div>
            </div>

            {/* Social Authentication */}
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setError('');
                  signInWithSocial('google').catch((err) =>
                    setError(err instanceof Error ? err.message : 'Google sign-in failed')
                  );
                }}
                className="h-10 flex items-center justify-center gap-2.5 rounded-lg bg-zinc-900/40 hover:bg-zinc-800/60 border border-white/[0.08] hover:border-white/[0.15] text-zinc-200 transition-all text-xs font-medium"
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
                <span>Google</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setError('');
                  signInWithSocial('github').catch((err) =>
                    setError(err instanceof Error ? err.message : 'GitHub sign-in failed')
                  );
                }}
                className="h-10 flex items-center justify-center gap-2.5 rounded-lg bg-zinc-900/40 hover:bg-zinc-800/60 border border-white/[0.08] hover:border-white/[0.15] text-zinc-200 transition-all text-xs font-medium"
              >
                <Github className="h-4 w-4 text-zinc-200" />
                <span>GitHub</span>
              </motion.button>
            </div>

            {/* Instant Demo Access Button */}
            <div className="pt-1">
              <motion.button
                type="button"
                whileTap={{ scale: 0.985 }}
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('chatrag_mock_user', JSON.stringify({
                      id: 'demo-lead-operator',
                      email: 'lead.operator@pulsar.internal',
                      user_metadata: { name: 'Lead Operator' }
                    }));
                  }
                  router.push('/');
                  router.refresh();
                }}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-lg bg-zinc-900/70 hover:bg-zinc-800/90 border border-white/[0.08] hover:border-white/[0.22] text-zinc-300 hover:text-white transition-all text-xs font-medium"
              >
                <span>Enter Demo Workspace</span>
                <span className="text-[10px] text-zinc-500 font-mono tracking-wider">• INSTANT PREVIEW</span>
              </motion.button>
            </div>

            {/* Toggle Login / Register */}
            <div className="text-center pt-5 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {isLogin ? (
                  <>Don&apos;t have an account? <span className="text-zinc-200 font-medium hover:underline ml-1">Sign up</span></>
                ) : (
                  <>Already have an account? <span className="text-zinc-200 font-medium hover:underline ml-1">Sign in</span></>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
