import React, { useState, useMemo } from 'react';
import {
  Eye,
  EyeOff,
  Zap,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  BookOpen,
  Sun,
  Moon,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { UserRole } from '../types/physics';
import { LegalModal } from '../components/LegalModal';
import { FIREBASE_PROJECT_ID } from '../firebase';
import authShowcaseImg from '../assets/images/auth_brand_showcase_1793456256863.jpg';

interface SignUpPageProps {
  defaultRole?: UserRole;
  onNavigateLogin: () => void;
  onNavigateHome: () => void;
  onAuthSuccess: (role: UserRole) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function evaluatePasswordStrength(pw: string): {
  score: number; // 0 to 4
  label: string;
  colorClass: string;
} {
  if (!pw) return { score: 0, label: 'Enter a password', colorClass: 'bg-slate-300 dark:bg-slate-700' };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score += 1;

  if (score <= 1) return { score: 1, label: 'Weak', colorClass: 'bg-rose-500' };
  if (score === 2) return { score: 2, label: 'Fair', colorClass: 'bg-amber-500' };
  if (score === 3) return { score: 3, label: 'Good', colorClass: 'bg-sky-500' };
  return { score: 4, label: 'Strong', colorClass: 'bg-emerald-500' };
}

export const SignUpPage: React.FC<SignUpPageProps> = ({
  defaultRole = 'student',
  onNavigateLogin,
  onNavigateHome,
  onAuthSuccess,
}) => {
  const { registerWithEmail, signInWithGoogle } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [gradeOrSubject, setGradeOrSubject] = useState(
    defaultRole === 'student' ? 'Class 10 CBSE' : 'Class 10 Physics'
  );
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [legalModal, setLegalModal] = useState<{ open: boolean; tab: 'terms' | 'privacy' }>({
    open: false,
    tab: 'terms',
  });

  const strength = useMemo(() => evaluatePasswordStrength(password), [password]);

  const handleRoleChange = (nextRole: UserRole) => {
    setRole(nextRole);
    setGradeOrSubject((prev) => {
      if (nextRole === 'student' && (prev === 'Class 10 Physics' || !prev.trim())) {
        return 'Class 10 CBSE';
      }
      if (nextRole === 'teacher' && (prev === 'Class 10 CBSE' || !prev.trim())) {
        return 'Class 10 Physics';
      }
      return prev;
    });
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      errs.fullName = 'Please enter your full name (at least 2 characters).';
    }
    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errs.email = 'Please enter a valid email address (e.g. name@school.edu).';
    }
    if (!password) {
      errs.password = 'Password is required.';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters long.';
    }
    if (!confirmPassword) {
      errs.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }
    if (!gradeOrSubject.trim()) {
      errs.gradeOrSubject =
        role === 'student'
          ? 'Please specify your Class / Grade.'
          : 'Please specify your Subject or teaching area.';
    }
    if (!acceptedTerms) {
      errs.acceptedTerms = 'You must accept the Terms and Privacy Policy to create an account.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const created = await registerWithEmail({
        displayName: fullName.trim(),
        email: email.trim(),
        password,
        role,
        gradeOrSubject: gradeOrSubject.trim(),
      });

      showToast({
        title: 'Account created successfully',
        description: `Welcome to LearnLoop AI, ${created.displayName}!`,
        variant: 'success',
      });
      onAuthSuccess(created.role);
    } catch (err: any) {
      setFormError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setFormError(null);
    if (!gradeOrSubject.trim()) {
      setFieldErrors({
        gradeOrSubject:
          role === 'student'
            ? 'Please enter your Class / Grade before continuing.'
            : 'Please enter your Subject area before continuing.',
      });
      return;
    }
    if (!acceptedTerms) {
      setFieldErrors({
        acceptedTerms: 'Please accept the Terms and Privacy Policy to continue with Google.',
      });
      return;
    }

    setFieldErrors({});
    setIsGoogleLoading(true);
    try {
      const outcome = await signInWithGoogle({
        displayName: fullName.trim(),
        role,
        gradeOrSubject: gradeOrSubject.trim(),
      });
      const resolvedRole = outcome.profile?.role || role;
      showToast({
        title: 'Signed in with Google',
        description: `Welcome to LearnLoop AI${
          outcome.profile?.displayName ? `, ${outcome.profile.displayName}` : ''
        }!`,
        variant: 'success',
      });
      onAuthSuccess(resolvedRole);
    } catch (err: any) {
      setFormError(err.message || 'Google sign-in could not be completed.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const showConsoleHint = formError?.includes('not yet enabled in your Firebase project');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 grid grid-cols-1 lg:grid-cols-12">
      {/* Left Split-Screen Brand Panel (Desktop) */}
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

        <div className="relative z-10 max-w-lg space-y-6 my-auto py-12">
          <p className="text-xs font-semibold text-cyan-400">
            Adaptive Physics Mastery · Voice & Socratic AI
          </p>
          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight text-balance">
            Master conceptual reasoning, not rote memorization.
          </h1>
          <p className="text-sm xl:text-base text-slate-300 leading-relaxed">
            Join students and educators using real-time misconception diagnostics, interactive
            circuit simulations, and SM-2 spaced repetition to build lasting exam readiness.
          </p>

          <div className="space-y-3.5 pt-2 text-sm text-slate-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-1" />
              <span>
                Dual evaluation of numerical answers and spoken/written physical explanations
              </span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-1" />
              <span>
                Personalized concept mastery map across all 5 Class 10 Electricity topics
              </span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-1" />
              <span>
                Dedicated Student and Teacher workspaces with role-verified analytics
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-400 flex items-center gap-2">
          <span>CBSE & ICSE Aligned</span>
          <span>·</span>
          <span>Wispr Flow Compatible</span>
          <span>·</span>
          <span>Secured with Firebase Auth</span>
        </div>
      </div>

      {/* Right Column: Registration Form */}
      <div className="lg:col-span-7 xl:col-span-6 flex flex-col justify-between p-6 sm:p-10 lg:p-12 overflow-y-auto">
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
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Create your account
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Select your role below to set up your personalized learning or teaching workspace.
            </p>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Account Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleRoleChange('student')}
                className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                  role === 'student'
                    ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Student</div>
                  <div className="text-[11px] opacity-75">Exam Prep & Tutor</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('teacher')}
                className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                  role === 'teacher'
                    ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Teacher</div>
                  <div className="text-[11px] opacity-75">Cohort Analytics</div>
                </div>
              </button>
            </div>
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

          {/* Continue with Google (Real Firebase Google OAuth) */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignUp}
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
                or register with email
              </span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Full Name */}
            <div>
              <label
                htmlFor="signup-name"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Full Name
              </label>
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (fieldErrors.fullName) setFieldErrors((p) => ({ ...p, fullName: '' }));
                }}
                placeholder="e.g. Aarav Sharma"
                className={`w-full px-3.5 py-2.5 rounded-xl border ${
                  fieldErrors.fullName
                    ? 'border-rose-500 focus:ring-rose-500'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'
                } bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-all`}
              />
              {fieldErrors.fullName && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label
                htmlFor="signup-email"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Email Address
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
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

            {/* Conditional Class / Grade OR Subject / Teaching Area */}
            <div>
              <label
                htmlFor="signup-grade-subject"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                {role === 'student' ? 'Class / Grade' : 'Subject or Teaching Area'}
              </label>
              <input
                id="signup-grade-subject"
                type="text"
                value={gradeOrSubject}
                onChange={(e) => {
                  setGradeOrSubject(e.target.value);
                  if (fieldErrors.gradeOrSubject)
                    setFieldErrors((p) => ({ ...p, gradeOrSubject: '' }));
                }}
                placeholder={
                  role === 'student'
                    ? 'e.g. Class 10 CBSE / Grade 10 ICSE'
                    : 'e.g. Class 10 Physics / Secondary Science'
                }
                className={`w-full px-3.5 py-2.5 rounded-xl border ${
                  fieldErrors.gradeOrSubject
                    ? 'border-rose-500 focus:ring-rose-500'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'
                } bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-all`}
              />
              {fieldErrors.gradeOrSubject && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                  {fieldErrors.gradeOrSubject}
                </p>
              )}
            </div>

            {/* Password + Strength Indicator */}
            <div>
              <label
                htmlFor="signup-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: '' }));
                  }}
                  placeholder="At least 8 characters"
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

              {/* Password Strength Meter */}
              <div className="mt-2 space-y-1">
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((seg) => (
                    <div
                      key={seg}
                      className={`h-1 rounded-full transition-colors ${
                        strength.score >= seg
                          ? strength.colorClass
                          : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Strength: {strength.label}</span>
                  <span>8+ chars, numbers & mixed case</span>
                </div>
              </div>

              {fieldErrors.password && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="signup-confirm-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword)
                      setFieldErrors((p) => ({ ...p, confirmPassword: '' }));
                  }}
                  placeholder="Re-enter your password"
                  className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border ${
                    fieldErrors.confirmPassword
                      ? 'border-rose-500 focus:ring-rose-500'
                      : confirmPassword && confirmPassword === password
                      ? 'border-emerald-500 focus:ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'
                  } bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={
                    showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* Terms and Privacy Checkbox */}
            <div>
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => {
                    setAcceptedTerms(e.target.checked);
                    if (fieldErrors.acceptedTerms)
                      setFieldErrors((p) => ({ ...p, acceptedTerms: '' }));
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setLegalModal({ open: true, tab: 'terms' })}
                    className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    onClick={() => setLegalModal({ open: true, tab: 'privacy' })}
                    className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    Privacy Policy
                  </button>
                  .
                </span>
              </label>
              {fieldErrors.acceptedTerms && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                  {fieldErrors.acceptedTerms}
                </p>
              )}
            </div>

            {/* Create Account CTA */}
            <button
              type="submit"
              disabled={isSubmitting || isGoogleLoading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>

          <p className="text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onNavigateLogin}
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>

        <div className="text-center text-[11px] text-slate-400">
          Protected by Firebase Authentication & Server-Side Role Verification
        </div>
      </div>

      <LegalModal
        isOpen={legalModal.open}
        initialTab={legalModal.tab}
        onClose={() => setLegalModal((p) => ({ ...p, open: false }))}
      />
    </div>
  );
};
