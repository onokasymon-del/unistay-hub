import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "student" | "landlord" | "admin";

export interface AuthProfile {
  id: string;
  full_name: string;
  phone: string | null;
  role: AppRole;
  institution_type: string | null;
  institution_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  loading: boolean;
  user: User | null;
  session: Session | null;
  profile: AuthProfile | null;
  role: AppRole | null;
  hasRole: (role: AppRole) => boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, phone, role, institution_type, institution_name, avatar_url, is_verified")
      .eq("id", userId)
      .maybeSingle();
    setProfile((data as AuthProfile | null) ?? null);
  };

  useEffect(() => {
    // 1) subscribe FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        // defer to avoid deadlock with supabase client
        setTimeout(() => {
          loadProfile(newSession.user.id);
        }, 0);
      } else {
        setProfile(null);
      }
    });

    // 2) then check existing
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    isAuthenticated: !!session,
    loading,
    user: session?.user ?? null,
    session,
    profile,
    role: profile?.role ?? null,
    hasRole: (r) => profile?.role === r,
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refreshProfile: async () => {
      if (session?.user) await loadProfile(session.user.id);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
