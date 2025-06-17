"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation"; // Import useRouter

interface User {
  id: string;
  email: string;
  name: string;
  role: "buyer" | "seller" | "both";
  avatar?: string;
  verified: boolean;
  joinedDate: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: { email: string; password: string; firstName: string; lastName: string; accountType: "buyer" | "seller" | "both" }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter(); // Initialize useRouter

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", session.user.email)
            .single();
          if (profileError && profileError.code !== "PGRST116") throw profileError;
          if (profile && profile.id && profile.email) {
            setUser({
              id: profile.id,
              email: profile.email,
              name: profile.name || "",
              role: profile.role as "buyer" | "seller" | "both",
              verified: !!profile.created_at,
              joinedDate: profile.created_at || new Date().toISOString(),
            });
          } else {
            const { data: authUser } = await supabase.auth.getUser();
            if (authUser.user && authUser.user.id && authUser.user.email) {
              const metaData = authUser.user.user_metadata || {};
              const roleFromMeta = metaData.role || "buyer";
              setUser({
                id: authUser.user.id,
                email: authUser.user.email,
                name: metaData.name || "",
                role: roleFromMeta === "auctioneer" ? "both" : (roleFromMeta as "buyer" | "seller" | "both"),
                verified: !!authUser.user.confirmed_at,
                joinedDate: authUser.user.created_at || new Date().toISOString(),
              });
            }
          }
        }
      } catch (error: any) {
        console.error("Error checking auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const fetchUser = async () => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", session.user.email)
            .single();
          if (profile && profile.id && profile.email) {
            setUser({
              id: profile.id,
              email: profile.email,
              name: profile.name || "",
              role: profile.role as "buyer" | "seller" | "both",
              verified: !!profile.created_at,
              joinedDate: profile.created_at || new Date().toISOString(),
            });
          } else {
            const { data: authUser } = await supabase.auth.getUser();
            if (authUser.user && authUser.user.id && authUser.user.email) {
              const metaData = authUser.user.user_metadata || {};
              const roleFromMeta = metaData.role || "buyer";
              setUser({
                id: authUser.user.id,
                email: authUser.user.email,
                name: metaData.name || "",
                role: roleFromMeta === "auctioneer" ? "both" : (roleFromMeta as "buyer" | "seller" | "both"),
                verified: !!authUser.user.confirmed_at,
                joinedDate: authUser.user.created_at || new Date().toISOString(),
              });
            }
          }
        };
        fetchUser();
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log("Attempting login with:", { email, password });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("email", email)
          .single();
        if (profileError && profileError.code !== "PGRST116") throw profileError;
        if (profile && profile.id && profile.email) {
          setUser({
            id: profile.id,
            email: profile.email,
            name: profile.name || "",
            role: profile.role as "buyer" | "seller" | "both",
            verified: !!profile.created_at,
            joinedDate: profile.created_at || new Date().toISOString(),
          });
        } else {
          const { data: authUser } = await supabase.auth.getUser();
          if (authUser.user && authUser.user.id && authUser.user.email) {
            const metaData = authUser.user.user_metadata || {};
            const roleFromMeta = metaData.role || "buyer";
            setUser({
              id: authUser.user.id,
              email: authUser.user.email,
              name: metaData.name || "",
              role: roleFromMeta === "auctioneer" ? "both" : (roleFromMeta as "buyer" | "seller" | "both"),
              verified: !!authUser.user.confirmed_at,
              joinedDate: authUser.user.created_at || new Date().toISOString(),
            });
          }
        }
      }
      return { success: true };
    } catch (error: any) {
      console.error("Login error:", error);
      setIsLoading(false);
      return { success: false, error: error.message || "Invalid email or password" };
    }
  };

  const register = async (userData: { email: string; password: string; firstName: string; lastName: string; accountType: "buyer" | "seller" | "both" }) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: `${userData.firstName} ${userData.lastName}`,
            role: userData.accountType,
            verified: false,
          },
        },
      });
      if (error) throw error;

      if (data?.user) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          email: userData.email,
          role: userData.accountType,
          created_at: new Date().toISOString(),
        });
        if (profileError) throw profileError;
      }
      setIsLoading(false);
      return { success: true };
    } catch (error: any) {
      setIsLoading(false);
      return { success: false, error: error.message || "Registration failed. Please try again." };
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      router.push("/"); // Navigate to root path after logout
      console.log("User logged out successfully and redirected to /");
    } catch (error: any) {
      console.error("Error during logout:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return { user, isLoading, login, register, logout, isAuthenticated: !!user };
}

export { AuthContext};
