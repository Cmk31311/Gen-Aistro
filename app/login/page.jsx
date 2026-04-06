'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { SparklesIcon } from '../../ui/Icons';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const { signIn, signUp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/datasets';

  const validatePassword = (pass) => {
    if (pass.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[a-z]/.test(pass)) return 'Password must contain a lowercase letter.';
    if (!/[A-Z]/.test(pass)) return 'Password must contain an uppercase letter.';
    if (!/[0-9]/.test(pass)) return 'Password must contain a number.';
    if (!/[^a-zA-Z0-9]/.test(pass)) return 'Password must contain a special character.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isSignUp) {
      if (!firstName.trim() || !lastName.trim()) {
        setError('First and last name are required for registration.');
        return;
      }
      const pError = validatePassword(password);
      if (pError) {
        setError(pError);
        return;
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password, { first_name: firstName, last_name: lastName });
        setSuccess('Check your email for a confirmation link.');
      } else {
        await signIn(email, password);
        router.push(redirect);
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 overflow-hidden relative">
      {/* Absolute Ambient Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute top-[10%] right-[15%] w-[600px] h-[500px] bg-accent/5 blur-[120px] rounded-full" 
        />
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 3, delay: 0.5 }}
          className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-900/10 blur-[150px] rounded-full" 
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center justify-center space-x-3 mb-10 group">
          <div className="w-10 h-10 rounded-[12px] bg-accent/10 border border-accent/20 flex items-center justify-center shadow-glow-accent transition-transform group-hover:scale-105">
            <SparklesIcon size={18} className="text-accent" />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-content-1 to-content-2 tracking-tight">Gen-Aistro</h1>
        </div>

        {/* Card */}
        <div className="glass-panel p-8 sm:p-10 shadow-2xl relative overflow-hidden rounded-3xl">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/5 blur-[80px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" />
          
          <h2 className="text-xl font-bold text-content-1 text-center mb-8 relative z-10 tracking-tight">
            {isSignUp ? 'Create Authorization' : 'System Access'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            <AnimatePresence mode="popLayout">
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
                  exit={{ opacity: 0, height: 0, filter: 'blur(4px)' }}
                  className="grid grid-cols-2 gap-4 pb-2"
                >
                  <div>
                    <label className="block text-[11px] uppercase tracking-widest font-bold text-content-3 mb-2">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required={isSignUp}
                      className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-content-1 placeholder-content-3/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all font-medium text-sm"
                      placeholder="Jane"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-widest font-bold text-content-3 mb-2">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required={isSignUp}
                      className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-content-1 placeholder-content-3/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all font-medium text-sm"
                      placeholder="Doe"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-[11px] uppercase tracking-widest font-bold text-content-3 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-content-1 placeholder-content-3/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all font-medium text-sm"
                placeholder="designation@domain.com"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-widest font-bold text-content-3 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-content-1 placeholder-content-3/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all font-medium text-sm"
                placeholder={isSignUp ? "8+ chars, upper, lower, num, special" : "••••••••"}
              />
              {isSignUp && (
                 <p className="text-[10px] text-content-3/70 mt-2 font-medium">Policy: 8+ length, A-Z, a-z, 0-9, !@#%</p>
              )}
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -5 }}
                  className="text-red-400 text-xs font-bold leading-relaxed bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3"
                >
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -5 }}
                  className="text-green-400 text-xs font-bold leading-relaxed bg-green-400/10 border border-green-400/20 rounded-xl px-4 py-3"
                >
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 bg-gradient-to-r from-accent to-accent-dim text-black font-bold tracking-wide rounded-xl shadow-[0_0_20px_rgba(229,169,61,0.15)] hover:shadow-[0_0_25px_rgba(229,169,61,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden text-sm uppercase"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative z-10">{loading ? 'Processing...' : isSignUp ? 'Initialize Registration' : 'Authenticate'}</span>
            </motion.button>
          </form>

          <div className="mt-8 text-center relative z-10">
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccess(''); }}
              className="text-xs font-semibold text-content-3 hover:text-accent transition-colors tracking-wide"
            >
              {isSignUp ? 'Existing Operative? Authenticate here' : "No access? Request Registration"}
            </button>
          </div>
        </div>

        {/* Back to home */}
        <div className="mt-6 text-center">
          <a href="/" className="text-xs font-bold text-content-3 hover:text-accent transition-colors uppercase tracking-widest">
            &larr; Return to Core Interface
          </a>
        </div>
      </motion.div>
    </div>
  );
}
