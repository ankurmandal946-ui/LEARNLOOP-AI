import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  FIREBASE_PROJECT_ID,
} from '../firebase';
import { AuthenticatedUserProfile, UserRole } from '../types/physics';

interface RegisterParams {
  displayName: string;
  email: string;
  password: string;
  role: UserRole;
  gradeOrSubject: string;
}

interface GoogleOnboardingParams {
  displayName: string;
  role: UserRole;
  gradeOrSubject: string;
}

interface AuthContextType {
  firebaseUser: User | null;
  userProfile: AuthenticatedUserProfile | null;
  isLoading: boolean;
  needsOnboarding: boolean;
  suggestedName: string;
  registerWithEmail: (params: RegisterParams) => Promise<AuthenticatedUserProfile>;
  loginWithEmail: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  signInWithGoogle: (presetOnboarding?: GoogleOnboardingParams) => Promise<{
    needsOnboarding: boolean;
    profile: AuthenticatedUserProfile | null;
  }>;
  completeGoogleOnboarding: (params: GoogleOnboardingParams) => Promise<AuthenticatedUserProfile>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshVerificationStatus: () => Promise<boolean>;
  updateUserPreferences: (updates: {
    displayName?: string;
    gradeOrSubject?: string;
    dailyGoalMinutes?: number;
  }) => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function formatFirebaseAuthError(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact your school administrator.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please verify your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 8 characters with letters and numbers.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful attempts. Please wait a moment or reset your password.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in window was closed before completing authentication.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
    case 'auth/operation-not-allowed':
      return `Email/Password sign-in is not yet enabled in your Firebase project (${FIREBASE_PROJECT_ID}). Enable it in Firebase Console → Authentication → Sign-in method → Email/Password, or use "Continue with Google" right away.`;
    default:
      return error?.message || 'Authentication failed. Please try again.';
  }
}

// Sanitize strings strictly to match firebase-blueprint.json bounds
function sanitizeField(val: string, maxLen: number, fallback: string): string {
  const trimmed = (val || '').trim().slice(0, maxLen);
  return trimmed.length > 0 ? trimmed : fallback;
}

async function syncVerifiedProfileToFirestore(
  fbUser: User,
  profile: AuthenticatedUserProfile
): Promise<void> {
  if (!fbUser.emailVerified) return;

  const userDocPath = `users/${fbUser.uid}`;
  const privateDocPath = `users/${fbUser.uid}/private/info`;
  const userRef = doc(db, 'users', fbUser.uid);
  const privateRef = doc(db, 'users', fbUser.uid, 'private', 'info');

  let existingSnap;
  try {
    existingSnap = await getDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, userDocPath);
  }

  const safeName = sanitizeField(profile.displayName, 100, 'Learner');
  const safeGrade = sanitizeField(profile.gradeOrSubject, 100, 'Class 10 Physics');
  const safeGoal = Math.min(240, Math.max(5, Math.round(profile.dailyGoalMinutes || 20)));

  if (!existingSnap.exists()) {
    try {
      await setDoc(userRef, {
        uid: fbUser.uid,
        displayName: safeName,
        role: profile.role,
        gradeOrSubject: safeGrade,
        dailyGoalMinutes: safeGoal,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, userDocPath);
    }
  } else {
    try {
      await updateDoc(userRef, {
        displayName: safeName,
        gradeOrSubject: safeGrade,
        dailyGoalMinutes: safeGoal,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, userDocPath);
    }
  }

  if (fbUser.email && fbUser.email.length >= 3) {
    let privateSnap;
    try {
      privateSnap = await getDoc(privateRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, privateDocPath);
    }

    const safeEmail = fbUser.email.trim().slice(0, 254);
    if (!privateSnap.exists()) {
      try {
        await setDoc(privateRef, {
          uid: fbUser.uid,
          email: safeEmail,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, privateDocPath);
      }
    } else if (privateSnap.data()?.email !== safeEmail) {
      try {
        await updateDoc(privateRef, {
          email: safeEmail,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, privateDocPath);
      }
    }
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<AuthenticatedUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false);
  const [suggestedName, setSuggestedName] = useState<string>('');

  const fetchServerProfile = useCallback(
    async (fbUser: User): Promise<AuthenticatedUserProfile | null> => {
      const token = await fbUser.getIdToken();
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return null;
      const data = await res.json();

      if (data.registered && data.profile) {
        const prof: AuthenticatedUserProfile = {
          ...data.profile,
          emailVerified: fbUser.emailVerified,
        };
        if (fbUser.emailVerified) {
          await syncVerifiedProfileToFirestore(fbUser, prof).catch((e) =>
            console.warn('Firestore profile sync skipped:', e)
          );
        }
        return prof;
      }

      // Also check Firestore directly if user is verified
      if (fbUser.emailVerified) {
        try {
          const snap = await getDoc(doc(db, 'users', fbUser.uid));
          if (snap.exists()) {
            const d = snap.data();
            const registerRes = await fetch('/api/auth/register-profile', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                displayName: d.displayName,
                role: d.role,
                gradeOrSubject: d.gradeOrSubject,
                dailyGoalMinutes: d.dailyGoalMinutes || 20,
              }),
            });
            if (registerRes.ok) {
              const regData = await registerRes.json();
              return regData.profile;
            }
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${fbUser.uid}`);
        }
      }

      setSuggestedName(fbUser.displayName || data.suggestedName || '');
      return null;
    },
    []
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUserProfile(null);
        setNeedsOnboarding(false);
        setIsLoading(false);
        return;
      }

      try {
        const prof = await fetchServerProfile(fbUser);
        if (prof) {
          setUserProfile(prof);
          setNeedsOnboarding(false);
        } else {
          setUserProfile(null);
          setNeedsOnboarding(true);
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchServerProfile]);

  const registerWithEmail = useCallback(
    async (params: RegisterParams): Promise<AuthenticatedUserProfile> => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        const cred = await createUserWithEmailAndPassword(
          auth,
          params.email.trim(),
          params.password
        );
        const fbUser = cred.user;

        await updateProfile(fbUser, { displayName: params.displayName.trim() });

        // Send genuine verification email asynchronously
        sendEmailVerification(fbUser).catch((e) =>
          console.warn('Verification email dispatch note:', e)
        );

        const token = await fbUser.getIdToken(true);
        const res = await fetch('/api/auth/register-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            displayName: params.displayName.trim(),
            role: params.role,
            gradeOrSubject: params.gradeOrSubject.trim(),
            dailyGoalMinutes: 20,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to register user profile.');
        }

        const createdProfile: AuthenticatedUserProfile = {
          ...data.profile,
          emailVerified: fbUser.emailVerified,
        };

        if (fbUser.emailVerified) {
          await syncVerifiedProfileToFirestore(fbUser, createdProfile);
        }

        setFirebaseUser(fbUser);
        setUserProfile(createdProfile);
        setNeedsOnboarding(false);
        return createdProfile;
      } catch (err: any) {
        throw new Error(formatFirebaseAuthError(err));
      }
    },
    []
  );

  const loginWithEmail = useCallback(
    async (email: string, password: string, rememberMe: boolean): Promise<void> => {
      try {
        await setPersistence(
          auth,
          rememberMe ? browserLocalPersistence : browserSessionPersistence
        );
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const prof = await fetchServerProfile(cred.user);
        if (prof) {
          setUserProfile(prof);
          setNeedsOnboarding(false);
        } else {
          setNeedsOnboarding(true);
        }
      } catch (err: any) {
        throw new Error(formatFirebaseAuthError(err));
      }
    },
    [fetchServerProfile]
  );

  const signInWithGoogle = useCallback(
    async (
      presetOnboarding?: GoogleOnboardingParams
    ): Promise<{ needsOnboarding: boolean; profile: AuthenticatedUserProfile | null }> => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        const cred = await signInWithPopup(auth, googleProvider);
        const fbUser = cred.user;

        const existingProf = await fetchServerProfile(fbUser);
        if (existingProf) {
          setUserProfile(existingProf);
          setNeedsOnboarding(false);
          return { needsOnboarding: false, profile: existingProf };
        }

        if (presetOnboarding) {
          const token = await fbUser.getIdToken(true);
          const safeName =
            presetOnboarding.displayName.trim() || fbUser.displayName || 'Learner';
          const res = await fetch('/api/auth/register-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              displayName: safeName,
              role: presetOnboarding.role,
              gradeOrSubject: presetOnboarding.gradeOrSubject.trim(),
              dailyGoalMinutes: 20,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to complete Google registration.');
          }
          const newProf: AuthenticatedUserProfile = {
            ...data.profile,
            emailVerified: fbUser.emailVerified,
          };
          await syncVerifiedProfileToFirestore(fbUser, newProf);
          setUserProfile(newProf);
          setNeedsOnboarding(false);
          return { needsOnboarding: false, profile: newProf };
        }

        setSuggestedName(fbUser.displayName || '');
        setNeedsOnboarding(true);
        return { needsOnboarding: true, profile: null };
      } catch (err: any) {
        throw new Error(formatFirebaseAuthError(err));
      }
    },
    [fetchServerProfile]
  );

  const completeGoogleOnboarding = useCallback(
    async (params: GoogleOnboardingParams): Promise<AuthenticatedUserProfile> => {
      const fbUser = auth.currentUser;
      if (!fbUser) {
        throw new Error('No active session found. Please sign in again.');
      }

      const token = await fbUser.getIdToken(true);
      const res = await fetch('/api/auth/register-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: params.displayName.trim() || fbUser.displayName || 'Learner',
          role: params.role,
          gradeOrSubject: params.gradeOrSubject.trim(),
          dailyGoalMinutes: 20,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not save account role.');
      }

      const prof: AuthenticatedUserProfile = {
        ...data.profile,
        emailVerified: fbUser.emailVerified,
      };

      if (fbUser.emailVerified) {
        await syncVerifiedProfileToFirestore(fbUser, prof);
      }

      setUserProfile(prof);
      setNeedsOnboarding(false);
      return prof;
    },
    []
  );

  const sendPasswordReset = useCallback(async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      throw new Error(formatFirebaseAuthError(err));
    }
  }, []);

  const resendVerificationEmail = useCallback(async (): Promise<void> => {
    if (!auth.currentUser) return;
    await sendEmailVerification(auth.currentUser);
  }, []);

  const refreshVerificationStatus = useCallback(async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    const verified = auth.currentUser.emailVerified;
    if (verified && userProfile) {
      await auth.currentUser.getIdToken(true);
      const updated = { ...userProfile, emailVerified: true };
      setUserProfile(updated);
      await syncVerifiedProfileToFirestore(auth.currentUser, updated);
    }
    return verified;
  }, [userProfile]);

  const updateUserPreferences = useCallback(
    async (updates: {
      displayName?: string;
      gradeOrSubject?: string;
      dailyGoalMinutes?: number;
    }): Promise<void> => {
      const fbUser = auth.currentUser;
      if (!fbUser || !userProfile) return;

      const token = await fbUser.getIdToken();
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const data = await res.json();
        const nextProfile: AuthenticatedUserProfile = {
          ...data.profile,
          emailVerified: fbUser.emailVerified,
        };
        setUserProfile(nextProfile);
        if (fbUser.emailVerified) {
          await syncVerifiedProfileToFirestore(fbUser, nextProfile);
        }
      }
    },
    [userProfile]
  );

  const logout = useCallback(async (): Promise<void> => {
    await signOut(auth);
    setUserProfile(null);
    setFirebaseUser(null);
    setNeedsOnboarding(false);
  }, []);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        isLoading,
        needsOnboarding,
        suggestedName,
        registerWithEmail,
        loginWithEmail,
        signInWithGoogle,
        completeGoogleOnboarding,
        sendPasswordReset,
        resendVerificationEmail,
        refreshVerificationStatus,
        updateUserPreferences,
        logout,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
