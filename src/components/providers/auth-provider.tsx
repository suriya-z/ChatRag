'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { AuthUser } from '@/lib/supabase-auth';
import type { SupabaseClient } from '@supabase/supabase-js'
import { isDemoLoginAllowed, DEMO_USER_STORAGE_KEY } from '@/lib/demo-mode';

type AuthContextType = {
  user: AuthUser | null;
  signOut: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  isAuthEnabled: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Debug: Initializing auth state
    // Debug: Auth enabled status
    
    const checkSession = async () => {
      // Check for demo / mock session in localStorage first
      if (typeof window !== 'undefined' && isDemoLoginAllowed()) {
        const storedMock = localStorage.getItem(DEMO_USER_STORAGE_KEY);
        if (storedMock) {
          try {
            const parsed = JSON.parse(storedMock);
            setUser(parsed as AuthUser);
            if (window.location.pathname.startsWith('/auth') && 
                !window.location.pathname.includes('/callback')) {
              router.push('/');
            }
            setLoading(false);
            return;
          } catch {
            localStorage.removeItem(DEMO_USER_STORAGE_KEY);
          }
        }
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user as AuthUser);
          
          if (window.location.pathname.startsWith('/auth') && 
              !window.location.pathname.includes('/callback')) {
            router.push('/');
          }
        } else {
          setUser(null);
          
          if (isAuthEnabled && 
              !window.location.pathname.startsWith('/auth')) {
            router.push('/auth');
          }
        }
      } catch (err) {
        console.error('AuthProvider session check:', err);
        setUser(null);
        if (isAuthEnabled && !window.location.pathname.startsWith('/auth')) {
          router.push('/auth');
        }
      } finally {
        setLoading(false);
      }
    }

    checkSession().catch(error => {
      console.error('AuthProvider: Error getting session:', error);
      setLoading(false);
      // Potentially redirect to auth on error too
      if (isAuthEnabled && !window.location.pathname.startsWith('/auth')) {
        router.push('/auth');
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Debug: Auth state changed
      // Debug: New session existence check
      
      const currentUser = session?.user as AuthUser | null;
      setUser(currentUser);

      if (currentUser) {
        // If user just signed in and is on auth page, redirect to home
        if (event === 'SIGNED_IN' && 
            window.location.pathname.startsWith('/auth') && 
            !window.location.pathname.includes('/callback')) {
          // Debug: User signed in, redirecting to home
          router.push('/');
        }
      } else {
        // If user just signed out and not on auth page, redirect to auth
        if (event === 'SIGNED_OUT' && 
            isAuthEnabled && 
            !window.location.pathname.startsWith('/auth')) {
          // Debug: User signed out, redirecting to auth
          router.push('/auth');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const signOut = async () => {
    try {
      // Debug: Signing out
      
      // Clear admin session when user signs out
      try {
        // Debug: Also clearing admin session
        await fetch('/api/admin/logout', {
          method: 'POST',
          credentials: 'include',
        });
        // Debug: Admin session cleared
      } catch (adminLogoutError) {
        console.error('Error clearing admin session:', adminLogoutError);
        // Continue with normal logout even if admin logout fails
      }
      
      // Proceed with normal user logout
      if (typeof window !== 'undefined') { localStorage.removeItem(DEMO_USER_STORAGE_KEY); }
      await supabase.auth.signOut();
      setUser(null);
      // Debug: Signed out successfully
      // Redirect handled by onAuthStateChange listener
      // router.push('/auth'); 
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const signInWithGitHub = async () => {
    // Debug: Signing in with GitHub
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
  };

  if (loading) {
    // Return a minimal loading indicator with theme-aware styling
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070709]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, signOut, signInWithGitHub, isAuthEnabled }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
