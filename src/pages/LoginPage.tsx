import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Zap,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Sun,
  Moon,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { FIREBASE_PROJECT_ID } from '../firebase';
import authShowcaseImg from '../assets/images/auth_brand_showcase_1793456256863.jpg';

interface LoginPageProps {
  onNavigateSignUp: () => void;
  onNavigateHome: () => void;
  onAuthSuccess: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigateSignUp,
  onNavigateHome,
  onAuthSuccess,
}) => {
  const { loginWithEmail, signInWithGoogle, sendPasswordReset } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  // Forgot password inline mode
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errs.email = 'Please enter your email address.';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!password) {
      errs.password = 'Please enter your password.';
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSubmitting(true);
    try {
      await loginWithEmail(email.trim(), password, rememberMe);
      showToast({
        title: 'Signed in successfully',
        description: 'Welcome back to your LearnLoop AI workspace.',
        variant: 'success',
      });
      onAuthSuccess();
    } catch (err: any) {
      setFormError(err.message || 'Sign in failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setFormError(null);
    setIsGoogleLoading(true);
    try {
      const outcome = await signInWithGoogle();
      if (!outcome.needsOnboarding) {
        showToast({
          title: 'Signed in with Google',
          description: `Welcome back${
            outcome.profile?.displayName ? `, ${outcome.profile.displayName}` : ''
          }!`,
          variant: 'success',
        });
      }
      onAuthSuccess();
    } catch (err: any) {
      setFormError(err.message || 'Google sign-in could not be completed.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    const targetEmail = (resetEmail || email).trim();
    if (!targetEmail || !EMAIL_REGEX.test(targetEmail)) {
      setResetError('Please enter a valid email address to receive a reset link.');
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordReset(targetEmail);
      setResetSent(true);
      showToast({
        title: 'Password reset email sent',
        description: `Check ${targetEmail} for instructions to reset your password.`,
        variant: 'info',
      });
    } catch (err: any) {
      setResetError(err.message || 'Could not send password reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  const showConsoleHint = formError?.includes('not yet enabled in your Firebase project');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 grid grid-cols-1 lg:grid-cols-12">
      {/* Left Split-Screen Brand Panel */}
      <div className="hidden lg:flex lg:col-span-5 xl:col-span-6 relative bg-slate-950 text-white p-10 xl:p-14 flex-col justify-between overflow-hidden border-r border-slate-800">
        {!imgFailed && (
          <img
            src={authShowcaseImg}
            alt="Precision optical lenses, copper resistance coils, and glowing filament sphere"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover opacity-45"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-indigo-950/75 to-slate-950/95" />

        <div className="relative z-10 flex items-center justify-between">
          <button
            type="button"
            onClick={onNavigateHome}
            className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-white hover:opacity-90 transition-opacity"
          >
            <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4" />
            </span>
            <span>LearnLoop AI</span>
          </button>
        </div>

        <div className="relative z-10 max-w-lg space-y-5 my-auto py-12">
          <p className="text-xs font-semibold text-cyan-400">
            Personalised Socratic Physics Tutor
          </p>
          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight text-balance">
            Pick up right where your reasoning left off.
          </h1>
          <p className="text-sm xl:text-base text-slate-300 leading-relaxed">
            Your concept mastery graph, diagnosed misconceptions, and SM-2 spaced repetition queue
            stay synced to your verified account.
          </p>
        </div>

        <div className="relative z-10 text-xs text-slate-400 flex items-center gap-2">
          <span>Electric Current</span>
          <span>·</span>
          <span>Ohm&apos;s Law</span>
          <span>·</span>
          <span>Series & Parallel Circuits</span>
        </div>
      </div>

      {/* Right Column: Login Form */}
      <div className="lg:col-span-7 xl:col-span-6 flex flex-col justify-between p-6 sm:p-10 lg:p-12">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle color theme"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <div className="w-full max-w-md mx-auto py-8 space-y-6">
          {isResetMode ? (
            <div className="space-y-5 animate-fadeIn">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Reset your password
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Enter the email address associated with your LearnLoop AI account and we will send
                  a Firebase password reset link.
                </p>
              </div>

              {resetSent ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Reset instructions sent</span>
                  </div>
                  <p>
                    If an account exists for <strong>{resetEmail || email}</strong>, an email with a
                    secure password reset link is on its way.
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div>
                    <label
                      htmlFor="reset-email"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="reset-email"
                        type="email"
                        value={resetEmail || email}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="you@school.edu"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {resetError && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{resetError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
                  >
                    {resetLoading ? 'Sending Reset Link...' : 'Send Password Reset Link'}
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsResetMode(false);
                  setResetSent(false);
                  setResetError(null);
                }}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                ← Return to Sign in
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Welcome back
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Sign in with your verified credentials to access your dashboard.
                </p>
              </div>

              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                  {showConsoleHint && (
                    <a
                      href={`https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/providers`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold underline pl-6"
                    >
                      <span>Open Firebase Auth Providers Console</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Continue with Google */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isGoogleLoading || isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold text-xs sm:text-sm shadow-2xs transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50"
                >
                  {isGoogleLoading ? (
                    <span className="w-4 h-4 border-2 border-slate-400 border-t-indigo-600 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.49 12.275c0-.85-.075-1.675-.215-2.475H12v4.69h6.45c-.28 1.49-1.125 2.755-2.395 3.605v2.99h3.875c2.265-2.085 3.56-5.16 3.56-8.81z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.955-1.075 7.94-2.915l-3.875-2.99c-1.075.72-2.45 1.15-4.065 1.15-3.125 0-5.77-2.11-6.715-4.945H1.28v3.085C3.255 21.305 7.31 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.285 14.3c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3V6.615H1.28C.465 8.235 0 10.065 0 12s.465 3.765 1.28 5.385l4.005-3.085z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.76 0 3.34.605 4.585 1.795l3.435-3.435C17.95 1.185 15.235 0 12 0 7.31 0 3.255 2.695 1.28 6.615l4.005 3.085c.945-2.835 3.59-4.95 6.715-4.95z"
                      />
                    </svg>
                  )}
                  <span>Continue with Google</span>
                </button>

                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                  <span className="shrink-0 px-3 text-[11px] text-slate-400">
                    or sign in with email
                  </span>
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                </div>
              </div>

              <form onSubmit={handleSignIn} noValidate className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Email Address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                    }}
                    placeholder="you@school.edu"
                    className={`w-full px-3.5 py-2.5 rounded-xl border ${
                      fieldErrors.email
                        ? 'border-rose-500 focus:ring-rose-500'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'
                    } bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-all`}
                  />
                  {fieldErrors.email && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(email);
                        setIsResetMode(true);
                      }}
                      className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password)
                          setFieldErrors((p) => ({ ...p, password: undefined }));
                      }}
                      placeholder="Enter your password"
                      className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border ${
                        fieldErrors.password
                          ? 'border-rose-500 focus:ring-rose-500'
                          : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'
                      } bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-all`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Remember me on this device
                    </span>
                  </label>
                </div>

                {/* Sign In CTA */}
                <button
                  type="submit"
                  disabled={isSubmitting || isGoogleLoading}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <span>Sign in</span>
                  )}
                </button>
              </form>

              <p className="text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                New to LearnLoop AI?{' '}
                <button
                  type="button"
                  onClick={onNavigateSignUp}
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Create a new account
                </button>
              </p>
            </>
          )}
        </div>

        <div className="text-center text-[11px] text-slate-400">
          Secured with Firebase Authentication · Zero Plaintext Credentials
        </div>
      </div>
    </div>
  );
};
