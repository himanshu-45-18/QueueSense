import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
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
  setupRecaptcha: (containerId: string) => any;
  sendPhoneOtp: (phoneNumber: string, appVerifier?: any) => Promise<any>;
  verifyPhoneOtp: (
    confirmationResult: any,
    verificationCode: string,
    role: Role,
    name?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_STORAGE_KEY = 'queuesense_active_user';
const LOCAL_USERS_KEY = 'queuesense_registered_users';

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredUser(user: User | null) {
  try {
    if (user) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

function getStoredLocalUsers(): User[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredLocalUser(user: User) {
  try {
    const users = getStoredLocalUsers().filter(
      (u) => u.email.toLowerCase() !== user.email.toLowerCase()
    );
    users.push(user);
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}

function mapDbUserToUser(dbUser: any): User {
  return {
    id: dbUser.id,
    email: dbUser.email || '',
    name: dbUser.name || dbUser.email?.split('@')[0] || 'User',
    role: (dbUser.role as Role) || 'patient',
    phoneNumber: dbUser.phone_number || null,
    photoURL: dbUser.photo_url || null,
    linkedDoctorId: dbUser.linked_doctor_id || null,
    linkedPatientId: dbUser.linked_patient_id || null,
    notificationPrefs: dbUser.notification_prefs || {
      waitTimeChanges: true,
      youAreNext: true,
      doctorLate: true,
    },
  };
}

function mapUserToDbUser(u: User) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    phone_number: u.phoneNumber || null,
    photo_url: u.photoURL || null,
    linked_doctor_id: u.linkedDoctorId || null,
    linked_patient_id: u.linkedPatientId || null,
    notification_prefs: u.notificationPrefs,
  };
}

async function safeSupabaseUpsertUser(u: User) {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('users').upsert(mapUserToDbUser(u));
  } catch (err) {
    console.warn('Supabase upsert user error:', err);
  }
}

async function safeSupabaseUpdateUser(id: string, u: Partial<User>) {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('users').update(u).eq('id', id);
  } catch (err) {
    console.warn('Supabase update user error:', err);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [loading, setLoading] = useState(true);

  // Sync auth state with Supabase & localStorage
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user && isMounted) {
            const sbUser = data.session.user;
            const { data: dbUser } = await supabase
              .from('users')
              .select('*')
              .eq('id', sbUser.id)
              .maybeSingle();

            if (dbUser) {
              const mapped = mapDbUserToUser(dbUser);
              setUser(mapped);
              saveStoredUser(mapped);
            }
          }
        } catch (err) {
          console.warn('Supabase auth session fetch error:', err);
        }
      }
      if (isMounted) setLoading(false);
    };

    initAuth();

    let authSubscription: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured) {
      const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user && isMounted) {
          const { data: dbUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (dbUser) {
            const mapped = mapDbUserToUser(dbUser);
            setUser(mapped);
            saveStoredUser(mapped);
          }
        } else if (event === 'SIGNED_OUT' && isMounted) {
          setUser(null);
          saveStoredUser(null);
        }
      });
      authSubscription = listener.subscription;
    }

    return () => {
      isMounted = false;
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string, role: Role) => {
    setLoading(true);
    try {
      const lowerEmail = email.trim().toLowerCase();

      // 1. Check seed demo users
      const seed = seedUsers.find((u) => u.email.toLowerCase() === lowerEmail);
      if (seed) {
        const updated = { ...seed, role };
        setUser(updated);
        saveStoredUser(updated);
        saveStoredLocalUser(updated);
        return;
      }

      // 2. Try Supabase Auth
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: lowerEmail,
          password,
        });

        if (!error && data.user) {
          const { data: dbUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

          let userObj: User;
          if (dbUser) {
            userObj = mapDbUserToUser(dbUser);
            if (userObj.role !== role) {
              userObj.role = role;
              userObj.linkedDoctorId = role === 'doctor' ? (userObj.linkedDoctorId || 'doc_1') : null;
              userObj.linkedPatientId = role === 'patient' ? (userObj.linkedPatientId || 'pat_demo_1') : null;
              await safeSupabaseUpdateUser(userObj.id, mapUserToDbUser(userObj));
            }
          } else {
            userObj = {
              id: data.user.id,
              email: lowerEmail,
              name: data.user.user_metadata?.name || lowerEmail.split('@')[0],
              role,
              linkedDoctorId: role === 'doctor' ? 'doc_1' : null,
              linkedPatientId: role === 'patient' ? 'pat_demo_1' : null,
              notificationPrefs: {
                waitTimeChanges: true,
                youAreNext: true,
                doctorLate: true,
              },
            };
            await safeSupabaseUpsertUser(userObj);
          }

          setUser(userObj);
          saveStoredUser(userObj);
          saveStoredLocalUser(userObj);
          return;
        }
      }

      // 3. Fallback for new user login:
      // If user is logging in with a new email/pass, auto-create/login user session seamlessly!
      const storedLocal = getStoredLocalUsers();
      let existing = storedLocal.find((u) => u.email.toLowerCase() === lowerEmail);

      if (!existing) {
        existing = {
          id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          email: lowerEmail,
          name: lowerEmail.split('@')[0],
          role,
          linkedDoctorId: role === 'doctor' ? 'doc_1' : null,
          linkedPatientId: role === 'patient' ? 'pat_demo_1' : null,
          notificationPrefs: {
            waitTimeChanges: true,
            youAreNext: true,
            doctorLate: true,
          },
        };

        await safeSupabaseUpsertUser(existing);
      } else {
        existing = { ...existing, role };
      }

      setUser(existing);
      saveStoredUser(existing);
      saveStoredLocalUser(existing);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    role: Role
  ) => {
    setLoading(true);
    try {
      const lowerEmail = email.trim().toLowerCase();
      let userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email: lowerEmail,
          password,
          options: {
            data: { name, role },
          },
        });

        if (!error && data.user) {
          userId = data.user.id;
        }
      }

      const newUser: User = {
        id: userId,
        email: lowerEmail,
        name: name || lowerEmail.split('@')[0],
        role,
        linkedDoctorId: role === 'doctor' ? 'doc_1' : null,
        linkedPatientId: role === 'patient' ? 'pat_demo_1' : null,
        notificationPrefs: {
          waitTimeChanges: true,
          youAreNext: true,
          doctorLate: true,
        },
      };

      await safeSupabaseUpsertUser(newUser);

      setUser(newUser);
      saveStoredUser(newUser);
      saveStoredLocalUser(newUser);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (role: Role) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) {
        const googleUser: User = {
          id: `user_google_${Date.now()}`,
          email: 'google_user@demo.com',
          name: 'Google User',
          role,
          linkedDoctorId: role === 'doctor' ? 'doc_1' : null,
          linkedPatientId: role === 'patient' ? 'pat_demo_1' : null,
          notificationPrefs: {
            waitTimeChanges: true,
            youAreNext: true,
            doctorLate: true,
          },
        };
        setUser(googleUser);
        saveStoredUser(googleUser);
        saveStoredLocalUser(googleUser);
      }
    } else {
      const googleUser: User = {
        id: `user_google_${Date.now()}`,
        email: 'google_user@demo.com',
        name: 'Google User',
        role,
        linkedDoctorId: role === 'doctor' ? 'doc_1' : null,
        linkedPatientId: role === 'patient' ? 'pat_demo_1' : null,
        notificationPrefs: {
          waitTimeChanges: true,
          youAreNext: true,
          doctorLate: true,
        },
      };
      setUser(googleUser);
      saveStoredUser(googleUser);
      saveStoredLocalUser(googleUser);
    }
  };

  const setupRecaptcha = (containerId: string) => {
    return { containerId };
  };

  const sendPhoneOtp = async (phoneNumber: string) => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signInWithOtp({ phone: phoneNumber });
      } catch (err) {
        console.warn('Phone OTP error:', err);
      }
    }
    return { phoneNumber };
  };

  const verifyPhoneOtp = async (
    confirmationResult: any,
    verificationCode: string,
    role: Role,
    name?: string
  ) => {
    const phone = confirmationResult?.phoneNumber || '+15551234567';
    const phoneUser: User = {
      id: `user_phone_${Date.now()}`,
      email: `${phone.replace(/\D/g, '')}@queuesense.local`,
      phoneNumber: phone,
      name: name || `User_${phone.slice(-4)}`,
      role,
      linkedDoctorId: role === 'doctor' ? 'doc_1' : null,
      linkedPatientId: role === 'patient' ? 'pat_demo_1' : null,
      notificationPrefs: {
        waitTimeChanges: true,
        youAreNext: true,
        doctorLate: true,
      },
    };

    await safeSupabaseUpsertUser(phoneUser);

    setUser(phoneUser);
    saveStoredUser(phoneUser);
    saveStoredLocalUser(phoneUser);
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signout error:', err);
      }
    }
    setUser(null);
    saveStoredUser(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      saveStoredUser(updated);

      if (prev.id) {
        safeSupabaseUpdateUser(prev.id, mapUserToDbUser(updated));
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
