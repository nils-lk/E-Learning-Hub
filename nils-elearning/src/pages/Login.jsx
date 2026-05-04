import React, { useState, useRef } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

const Login = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPass, setIsForgotPass] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [otpType, setOtpType] = useState('signup');
  const [otpArray, setOtpArray] = useState(['', '', '', '', '', '', '', '']);
  const otpInputRefs = useRef([]);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Already logged in — redirect
  if (user) return <Navigate to="/dashboard" replace />;

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isForgotPass) {
        if (!email) throw new Error('Please enter your email.');
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setSuccess('OTP code sent! Please check your email.');
        setOtpType('recovery');
        setShowOtp(true);
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/dashboard');
      } else {
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });
        if (error) throw error;

        // Create profile record immediately
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: data.user.email,
            full_name: fullName,
            role: 'user',
          });
        }
        setSuccess('Account created! An OTP code has been sent to your email.');
        setOtpType('signup');
        setShowOtp(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const token = otpArray.join('').trim();
    if (token.length < 6) return;
    
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: otpType });
      if (error) throw error;
      
      if (otpType === 'recovery') {
        navigate('/update-password');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950 pt-16">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-nilsBlue-900 via-nilsBlue-800 to-nilsBlue-700 items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-nilsGold/10 rounded-full" />
        <div className="relative text-center text-white px-10">
          <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <GraduationCap className="w-10 h-10 text-nilsGold" />
          </div>
          <h2 className="text-3xl font-extrabold mb-3">NILS E-Learning Hub</h2>
          <p className="text-nilsBlue-200 leading-relaxed max-w-xs">
            Access world-class labour studies courses. Advance your career with NILS expertise.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
            {['Labour Law', 'HR Management', 'Workplace Safety', 'Industrial Relations'].map(tag => (
              <div key={tag} className="bg-white/10 rounded-xl px-3 py-2 text-nilsBlue-100">
                {tag}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 lg:max-w-md xl:max-w-lg">
        <div className="w-full max-w-md animate-slide-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-gradient-to-br from-nilsBlue-700 to-nilsBlue-500 rounded-xl flex items-center justify-center shadow">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-nilsBlue-800 dark:text-nilsBlue-200 leading-none">NILS E-Learning Hub</p>
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">
            {showOtp ? 'Verify your email' : isForgotPass ? 'Reset Password' : isLogin ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">
            {showOtp ? `We sent a 6-digit code to ${email}` : isForgotPass ? 'Enter your email to receive a reset link.' : isLogin ? 'Sign in to access your courses.' : 'Join NILS E-Learning Hub today — it\'s free.'}
          </p>

          {/* Error / success alerts */}
          {error && (
            <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm rounded-xl">
              {success}
            </div>
          )}

          {showOtp ? (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
                  Enter Verification Code (6-8 digits)
                </label>
                <div className="flex justify-center gap-1.5 sm:gap-2">
                  {otpArray.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => otpInputRefs.current[idx] = el}
                      type="text"
                      maxLength={8}
                      value={digit}
                      onChange={e => {
                        const val = e.target.value;
                        if (val.length > 1) {
                          const pasted = val.replace(/\s/g, '').slice(0, 8).split('');
                          const newOtp = [...otpArray];
                          pasted.forEach((char, i) => { if (idx + i < 8) newOtp[idx + i] = char; });
                          setOtpArray(newOtp);
                          otpInputRefs.current[Math.min(idx + pasted.length, 7)]?.focus();
                        } else {
                          const newOtp = [...otpArray];
                          newOtp[idx] = val.trim();
                          setOtpArray(newOtp);
                          if (val && idx < 7) otpInputRefs.current[idx + 1]?.focus();
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Backspace' && !digit && idx > 0) {
                          otpInputRefs.current[idx - 1]?.focus();
                        }
                      }}
                      className="w-9 h-11 sm:w-10 sm:h-12 text-center text-lg font-bold bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-nilsBlue-500 focus:ring-4 focus:ring-nilsBlue-500/20 transition-all text-gray-900 dark:text-white"
                    />
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || otpArray.join('').trim().length < 6}
                className="btn-primary w-full justify-center py-3 text-base mt-2"
              >
                {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Verifying...</span> : (otpType === 'recovery' ? 'Verify OTP & Reset Password' : 'Verify OTP & Login')}
              </button>
              <button
                type="button"
                onClick={() => setShowOtp(false)}
                className="w-full text-center text-sm font-semibold text-nilsBlue-700 dark:text-nilsBlue-400 hover:underline mt-4"
              >
                Cancel
              </button>
            </form>
          ) : (
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && !isForgotPass && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
                <input
                  id="signup-name"
                  type="text"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required={!isLogin}
                  className="form-input"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  id="auth-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="form-input pl-10"
                />
              </div>
            </div>

            {!isForgotPass && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                  {isLogin && (
                    <button type="button" onClick={() => { setIsForgotPass(true); setError(''); setSuccess(''); }} className="text-xs text-nilsBlue-600 dark:text-nilsBlue-400 hover:underline">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  id="auth-password"
                  type={showPass ? 'text' : 'password'}
                  placeholder={isLogin ? 'Your password' : 'Min. 6 characters'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="form-input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            )}

            <button
              id="auth-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Processing…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {isForgotPass ? 'Send Reset Link' : isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>
          )}

          {!showOtp && (
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {isForgotPass ? (
              <button onClick={() => { setIsForgotPass(false); setError(''); setSuccess(''); }} className="font-semibold text-nilsBlue-700 dark:text-nilsBlue-400 hover:underline">
                Back to Sign In
              </button>
            ) : isLogin ? (
              <>
                Don't have an account?{' '}
                <button
                  id="auth-toggle"
                  onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
                  className="font-semibold text-nilsBlue-700 dark:text-nilsBlue-400 hover:underline"
                >
                  Sign Up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  id="auth-toggle"
                  onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
                  className="font-semibold text-nilsBlue-700 dark:text-nilsBlue-400 hover:underline"
                >
                  Sign In
                </button>
              </>
            )}
          </p>
          )}

          <p className="mt-4 text-center text-xs text-gray-400">
            <Link to="/" className="hover:text-nilsBlue-600 dark:hover:text-nilsBlue-400">← Back to Home</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
