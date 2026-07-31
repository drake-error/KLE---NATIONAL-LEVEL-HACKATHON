import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // If email confirmation is enabled, they need to check email.
        // Usually, in development, it's auto-confirmed or we show a message.
        if (errorMsg === '') {
          alert('Account created! If email confirmation is enabled, please check your inbox.');
        }
      }
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      setErrorMsg(error.message);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-surface border border-outline-variant rounded-2xl shadow-lg p-8 relative overflow-hidden">
        {/* Healthcare themed decorative top border */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-tertiary"></div>
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-container text-primary mb-4">
            <span className="material-symbols-outlined text-4xl" data-icon="local_hospital">local_hospital</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface mb-2">
            {isLogin ? 'Welcome Back' : 'Create an Account'}
          </h1>
          <p className="text-body-md text-on-surface-variant">
            {isLogin 
              ? 'Sign in to access your secure profile.' 
              : 'Join the network and set up your secure data vault.'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-error-container text-on-error-container text-body-sm font-bold rounded-lg border border-error/20">
            {errorMsg}
          </div>
        )}

        <form className="flex flex-col gap-4" onSubmit={handleAuth}>
          <div>
            <label className="block text-label-md font-medium text-on-surface mb-1">Email Address</label>
            <input 
              type="email" 
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-body-md transition-all outline-none"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-label-md font-medium text-on-surface">Password</label>
              {isLogin && <a href="#" className="text-label-sm text-primary hover:underline">Forgot password?</a>}
            </div>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-body-md transition-all outline-none"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-on-primary font-bold py-3 rounded-xl transition-all shadow-md mt-2 active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            {!loading && <span className="material-symbols-outlined text-sm" data-icon="arrow_forward">arrow_forward</span>}
          </button>
        </form>

        <div className="my-6 flex items-center justify-center gap-4">
          <hr className="flex-1 border-outline-variant" />
          <span className="text-label-sm text-on-surface-variant font-bold uppercase">or</span>
          <hr className="flex-1 border-outline-variant" />
        </div>

        <button 
          onClick={handleGoogleLogin}
          type="button"
          className="w-full bg-surface hover:bg-surface-container text-on-surface font-bold py-3 rounded-xl border border-outline transition-all active:scale-95 flex justify-center items-center gap-2"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>

        <div className="mt-8 pt-6 border-t border-outline-variant text-center">
          <p className="text-body-sm text-on-surface-variant">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-bold hover:underline"
            >
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
