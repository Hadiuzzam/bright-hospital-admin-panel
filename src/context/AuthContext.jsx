import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { auth } from '../config.js';
import { getCurrentUserProfile, loginWithEmail, registerPatientAccount } from '../services/hmsService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setUser(null);
          return;
        }
        const profile = await getCurrentUserProfile(firebaseUser);
        if (!profile) {
          setUser(null);
          await auth.signOut();
          return;
        }
        setUser(profile);
      } catch (error) {
        console.error(error);
        setUser(null);
      } finally {
        setAuthReady(true);
      }
    });
    return unsubscribe;
  }, []);

  const login = async ({ email, password }) => {
    setAuthLoading(true);
    try {
      const profile = await loginWithEmail(email, password);
      setUser(profile);
      toast.success(`Welcome back, ${profile.name}`);
      return profile;
    } catch (error) {
      toast.error(error?.message || 'Login failed. Check Firebase Auth, Firestore rules and user profile.');
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const patientSignup = async (payload) => {
    setAuthLoading(true);
    try {
      const profile = await registerPatientAccount(payload);
      setUser(profile);
      toast.success('Patient portal account created');
      return profile;
    } catch (error) {
      toast.error(error?.message || 'Patient registration failed');
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const refreshUser = (updatedUser) => setUser(updatedUser);

  const logout = async () => {
    await auth.signOut();
    setUser(null);
    toast.success('Logged out');
  };

  const value = useMemo(
    () => ({ user, login, logout, refreshUser, authLoading, authReady, patientSignup }),
    [user, authLoading, authReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
