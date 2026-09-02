import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import type { Role, User } from '../lib/types';
import { seedUsers } from '../lib/mockData';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, role: Role) => Promise<void>;
  signup: (
    email: string,
    password: string,
    name: string,
    role: Role
  ) => Promise<void>;
  loginWithGoogle: (role: Role) => Promise<void>;
  setupRecaptcha: (containerId: string) => RecaptchaVerifier;
  sendPhoneOtp: (
    phoneNumber: string,
    appVerifier: RecaptchaVerifier
  ) => Promise<ConfirmationResult>;
  verifyPhoneOtp: (
    confirmationResult: ConfirmationResult,
    verificationCode: string,
    role: Role,
    name?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync auth state with Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUser(userDoc.data() as User);
          } else {
            const fallbackUser: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              phoneNumber: firebaseUser.phoneNumber || null,
              photoURL: firebaseUser.photoURL || null,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              role: 'patient',
              linkedDoctorId: null,
              linkedPatientId: 'pat_2',
              notificationPrefs: {
                waitTimeChanges: true,
                youAreNext: true,
                doctorLate: true,
              },
            };
            setUser(fallbackUser);
          }
        } catch (err) {
          console.warn('Could not fetch user profile from Firestore:', err);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Email / Password Login
  const login = async (email: string, password: string, role: Role) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const userDocRef = doc(db, 'users', cred.user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data() as User;
        // If role selected in form differs, update profile
        if (data.role !== role) {
          const updated = {
            ...data,
            role,
            linkedDoctorId: role === 'doctor' ? (data.linkedDoctorId || 'doc_1') : null,
            linkedPatientId: role === 'patient' ? (data.linkedPatientId || 'pat_2') : null,
          };
          await updateDoc(userDocRef, updated);
          setUser(updated);
          return;
        }
        setUser(data);
        return;
      } else {
        const newUser: User = {
          id: cred.user.uid,
          email,
          name: cred.user.displayName || email.split('@')[0],
          role,
          linkedDoctorId: role === 'doctor' ? 'doc_1' : null,
          linkedPatientId: role === 'patient' ? 'pat_2' : null,
          notificationPrefs: {
            waitTimeChanges: true,
            youAreNext: true,
            doctorLate: true,
          },
        };
        await setDoc(userDocRef, newUser);
        setUser(newUser);
        return;
      }
    } catch (err: unknown) {
      // If demo credentials matched
      const found = seedUsers.find((u) => u.email === email && u.role === role);
      if (found) {
        setUser(found);
        return;
      }
      throw err;
    }
  };

  // Email / Password Signup
  const signup = async (
    email: string,
    password: string,
    name: string,
    role: Role
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });

    const newUser: User = {
      id: cred.user.uid,
      email,
      name,
      role,
      linkedDoctorId: role === 'doctor' ? 'doc_1' : null,
      linkedPatientId: role === 'patient' ? 'pat_2' : null,
      notificationPrefs: {
        waitTimeChanges: true,
        youAreNext: true,
        doctorLate: true,
      },
    };

    await setDoc(doc(db, 'users', cred.user.uid), newUser);
    setUser(newUser);
  };

  // Google Sign In
  const loginWithGoogle = async (role: Role) => {
    const cred = await signInWithPopup(auth, googleProvider);
    const userDocRef = doc(db, 'users', cred.user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const data = userDoc.data() as User;
      setUser(data);
    } else {
      const newUser: User = {
        id: cred.user.uid,
        email: cred.user.email || '',
        phoneNumber: cred.user.phoneNumber || null,
        photoURL: cred.user.photoURL || null,
        name: cred.user.displayName || cred.user.email?.split('@')[0] || 'User',
        role,
        linkedDoctorId: role === 'doctor' ? 'doc_1' : null,
        linkedPatientId: role === 'patient' ? 'pat_2' : null,
        notificationPrefs: {
          waitTimeChanges: true,
          youAreNext: true,
          doctorLate: true,
        },
      };
      await setDoc(userDocRef, newUser);
      setUser(newUser);
    }
  };

  // Phone Auth: Setup invisible / visible reCAPTCHA verifier
  const setupRecaptcha = (containerId: string): RecaptchaVerifier => {
    return new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      },
    });
  };

  // Phone Auth: Send OTP SMS
  const sendPhoneOtp = async (
    phoneNumber: string,
    appVerifier: RecaptchaVerifier
  ): Promise<ConfirmationResult> => {
    return await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  };

  // Phone Auth: Verify OTP Code
  const verifyPhoneOtp = async (
    confirmationResult: ConfirmationResult,
    verificationCode: string,
    role: Role,
    name?: string
  ) => {
    const cred = await confirmationResult.confirm(verificationCode);
    const userDocRef = doc(db, 'users', cred.user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const data = userDoc.data() as User;
      setUser(data);
    } else {
      const displayName = name || `User_${cred.user.phoneNumber?.slice(-4) || 'Guest'}`;
      if (name) {
        await updateProfile(cred.user, { displayName });
      }

      const newUser: User = {
        id: cred.user.uid,
        email: cred.user.email || `${cred.user.phoneNumber?.replace('+', '') || Date.now()}@queuesense.local`,
        phoneNumber: cred.user.phoneNumber || null,
        name: displayName,
        role,
        linkedDoctorId: role === 'doctor' ? 'doc_1' : null,
        linkedPatientId: role === 'patient' ? 'pat_2' : null,
        notificationPrefs: {
          waitTimeChanges: true,
          youAreNext: true,
          doctorLate: true,
        },
      };
      await setDoc(userDocRef, newUser);
      setUser(newUser);
    }
  };

  // Logout
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase signout error:', err);
    }
    setUser(null);
  };

  // Update user profile in Firestore
  const updateUser = async (updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };

      if (prev.id) {
        updateDoc(doc(db, 'users', prev.id), updates).catch((err) =>
          console.warn('Error updating user document in Firestore:', err)
        );
      }
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        loginWithGoogle,
        setupRecaptcha,
        sendPhoneOtp,
        verifyPhoneOtp,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
