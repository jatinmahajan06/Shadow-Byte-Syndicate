"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { doc, onSnapshot, Unsubscribe } from "firebase/firestore";
import { getFirebaseClient, isFirebaseConfigured } from "@/firebase/config";
import { logoutAll } from "@/firebase/auth";
import { UserRole } from "@/lib/constants";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  studentId?: string | null;
  department?: string | null;
  phone?: string | null;
  photoURL?: string | null;
  preferences?: {
    notifications?: boolean;
    theme?: string;
  };
}

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  configured: boolean;
  logout: () => Promise<void>;
  refreshSessionToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  profile: null,
  loading: true,
  configured: false,
  logout: async () => {},
  refreshSessionToken: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    const isReady = isFirebaseConfigured();
    setConfigured(isReady);

    if (!isReady) {
      // Fallback: check server session cookie if client SDK is awaiting live env config
      fetch("/api/auth/me")
        .then((res) => res.json())
        .then((data) => {
          if (data?.authenticated && data?.user) {
            setProfile({
              uid: data.user.id,
              email: data.user.email,
              name: data.user.name,
              role: data.user.role,
              isActive: true,
              studentId: data.user.studentId,
              department: data.user.department,
            });
          } else {
            setProfile(null);
          }
        })
        .catch(() => setProfile(null))
        .finally(() => setLoading(false));
      return;
    }

    let profileUnsubscribe: Unsubscribe | null = null;
    const { auth, db } = getFirebaseClient();

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      // Clean up prior Firestore profile listener
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      if (!user) {
        setFirebaseUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setFirebaseUser(user);

      // Real-time Firestore listener on the user's own profile document
      const userDocRef = doc(db, "users", user.uid);
      profileUnsubscribe = onSnapshot(
        userDocRef,
        (snap) => {
          if (!snap.exists()) {
            // Check /api/auth/me fallback in case user doc is currently provisioning during signup
            fetch("/api/auth/me")
              .then((r) => r.json())
              .then((data) => {
                if (data?.authenticated && data?.user) {
                  setProfile({
                    uid: data.user.id,
                    email: data.user.email,
                    name: data.user.name,
                    role: data.user.role,
                    isActive: true,
                    studentId: data.user.studentId,
                    department: data.user.department,
                  });
                } else {
                  setProfile(null);
                }
              })
              .catch(() => setProfile(null))
              .finally(() => setLoading(false));
            return;
          }

          const data = snap.data();
          if (data.isActive === false) {
            // Immediate real-time revocation if deactivated by Super Admin
            signOut(auth).catch(() => {});
            fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
            setProfile(null);
            setFirebaseUser(null);
            setLoading(false);
            return;
          }

          setProfile({
            uid: user.uid,
            email: data.email || user.email || "",
            name: data.name || user.displayName || "Member",
            role: data.role as UserRole,
            isActive: data.isActive !== false,
            studentId: data.studentId || null,
            department: data.department || null,
            phone: data.phone || null,
            photoURL: data.photoURL || user.photoURL || null,
            preferences: data.preferences || { notifications: true, theme: "dark" },
          });
          setLoading(false);
        },
        (err) => {
          console.error("[AuthContext Profile Snapshot Error]", err);
          setLoading(false);
        }
      );
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  const logout = useCallback(async () => {
    await logoutAll();
    setFirebaseUser(null);
    setProfile(null);
  }, []);

  const refreshSessionToken = useCallback(async () => {
    if (firebaseUser) {
      await firebaseUser.getIdToken(true);
    }
  }, [firebaseUser]);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        configured,
        logout,
        refreshSessionToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}

