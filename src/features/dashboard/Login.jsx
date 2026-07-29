import React, { useState } from 'react';

export default function Login({ setCurrentTab, setIsLoggedIn, setUserName }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] bg-background p-4 animate-fadeIn">
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
              ? 'Sign in to access the ResQ-Plus Command Center.' 
              : 'Join the ResQ-Plus network to manage emergency fleets.'}
          </p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={(e) => { 
          e.preventDefault(); 
          setIsLoggedIn(true); 
          setUserName(name || email.split('@')[0] || 'Guest');
          setCurrentTab('dashboard'); 
        }}>
          {!isLogin && (
            <div>
              <label className="block text-label-md font-medium text-on-surface mb-1">Full Name</label>
              <input 
                type="text" 
                placeholder="E.g. Alex Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-body-md transition-all"
                required
              />
            </div>
          )}
          
          <div>
            <label className="block text-label-md font-medium text-on-surface mb-1">Email Address</label>
            <input 
              type="email" 
              placeholder="user@resqplus.med"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-body-md transition-all"
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
              className="w-full bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-body-md transition-all"
              required
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90 text-on-primary font-bold py-3 rounded-xl transition-all shadow-md mt-4 active:scale-95 flex justify-center items-center gap-2"
          >
            {isLogin ? 'Sign In' : 'Create Account'}
            <span className="material-symbols-outlined text-sm" data-icon="arrow_forward">arrow_forward</span>
          </button>
        </form>

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
