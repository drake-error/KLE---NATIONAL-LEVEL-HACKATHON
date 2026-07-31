import React, { useState, useEffect } from 'react';
import DashboardLayout from './features/dashboard/DashboardLayout';
import { IntroAnimation } from './components/IntroAnimation';
import { supabase } from './lib/supabase';

const defaultSession = {
  user: {
    id: 'demo-resqplus-user',
    email: 'admin@resqplus.org',
    user_metadata: {
      full_name: 'Dr. Admin',
      avatar_url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=250&auto=format&fit=crop'
    }
  }
};

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [session, setSession] = useState(defaultSession);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session or use default demo session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session || defaultSession);
      setIsLoading(false);
    }).catch(() => {
      setSession(defaultSession);
      setIsLoading(false);
    });

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session || defaultSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <>
      {showIntro && <IntroAnimation onDone={() => setShowIntro(false)} />}
      <DashboardLayout session={session} />
    </>
  );
}
