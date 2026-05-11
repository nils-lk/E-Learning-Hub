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
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/update-password`
        });
        if (error) {
          // If SMTP is broken, give a clear actionable message
          const isSmtpError = error.message?.toLowerCase().includes('sending') || 
                              error.message?.toLowerCase().includes('smtp') ||
                              error.message?.toLowerCase().includes('email');
          if (isSmtpError) {
            setError('Email sending failed. Your SMTP server is not configured correctly in the Supabase Dashboard. Contact the system administrator.');
          } else {
            throw error;
          }
        } else {
          setSuccess('A verification code has been sent to your email.');
          setOtpType('recovery');
          setShowOtp(true);
        }
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        navigate('/dashboard');
      } else {
        // Signup flow
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName } }
        });

        // Check if it's only a email-sending error (user was still created in DB)
        const isEmailSendError = error?.message?.toLowerCase().includes('sending') ||
                                  error?.message?.toLowerCase().includes('confirmation') ||
                                  error?.message?.toLowerCase().includes('smtp');

        if (error && !isEmailSendError) {
          // Real error (duplicate email, invalid password, etc.)
          throw error;
        }

        // User was created (even if email failed) — save profile
        const userId = data?.user?.id;
        if (userId) {
          await supabase.from('profiles').upsert({
            id: userId,
            email: email.trim(),
            full_name: fullName,
            role: 'user',
          });
        }

        if (data?.session) {
          // Email confirmation is OFF in Supabase — user is logged in directly
          navigate('/dashboard');
        } else {
          // Email confirmation is ON — Supabase automatically sent the signup OTP.
          // Show verification screen.
          setSuccess('Account created! A verification code has been sent to your email.');
          setOtpType('signup');
          setShowOtp(true);
        }
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
      // 'email' is the correct type for signInWithOtp verification
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token,
        type: otpType // 'email' for signup/login OTP, 'recovery' for password reset
      });
      if (error) throw error;
      if (otpType === 'recovery') {
        navigate('/update-password');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Invalid or expired OTP. Please try again.');
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
            {showOtp ? `We sent a code to ${email}` : isForgotPass ? 'Enter your email to receive a password reset code.' : isLogin ? 'Sign in to access your courses.' : 'Join NILS E-Learning Hub today — it\'s free.'}
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
                <div className="flex justify-center gap-1 sm:gap-2">
                  {otpArray.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => otpInputRefs.current[idx] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      value={digit}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, ''); // digits only
                        if (val.length > 1) {
                          // Handle paste of full code
                          const pasted = val.slice(0, 8).split('');
                          const newOtp = ['', '', '', '', '', '', '', ''];
                          pasted.forEach((char, i) => { if (i < 8) newOtp[i] = char; });
                          setOtpArray(newOtp);
                          otpInputRefs.current[Math.min(pasted.length, 7)]?.focus();
                        } else {
                          const newOtp = [...otpArray];
                          newOtp[idx] = val;
                          setOtpArray(newOtp);
                          if (val && idx < 7) otpInputRefs.current[idx + 1]?.focus();
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Backspace' && !digit && idx > 0) {
                          otpInputRefs.current[idx - 1]?.focus();
                        }
                      }}
                      className="w-10 h-12 sm:w-11 sm:h-13 text-center text-lg sm:text-xl font-bold bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-nilsBlue-500 focus:ring-4 focus:ring-nilsBlue-500/20 transition-all text-gray-900 dark:text-white"
                    />
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || otpArray.join('').trim().length < 6}
                className="btn-primary w-full justify-center py-3 text-base mt-2"
              >
                {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Verifying...</span> : 'Verify OTP & Login'}
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
