import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { enterpriseApiClient, personalApiClient } from "@/lib/api";

type AuthUser = { user_id: number; email: string; role?: string } | null;

type AuthContextType = {
  user: AuthUser;
  accessToken?: string;
  refreshToken?: string;
  login: (email: string, password: string) => Promise<boolean>;
  register: (first_name: string, last_name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isReady: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_KEY = "auth_access_token";
const REFRESH_KEY = "auth_refresh_token";
const USER_KEY = "auth_user";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser>(null);
  const [accessToken, setAccessToken] = useState<string | undefined>();
  const [refreshToken, setRefreshToken] = useState<string | undefined>();
  const [isReady, setIsReady] = useState(false);

  // Charger depuis localStorage
  useEffect(() => {
    try {
      const a = localStorage.getItem(ACCESS_KEY) || undefined;
      const r = localStorage.getItem(REFRESH_KEY) || undefined;
      const u = localStorage.getItem(USER_KEY);
      setAccessToken(a);
      setRefreshToken(r);
      setUser(u ? JSON.parse(u) : null);
    } finally {
      setIsReady(true);
    }
  }, []);

  // Appliquer le token aux clients API
  useEffect(() => {
    enterpriseApiClient.setAuthToken(accessToken);
    personalApiClient.setAuthToken(accessToken);
    enterpriseApiClient.setRefreshToken(refreshToken);
    personalApiClient.setRefreshToken(refreshToken);
  }, [accessToken, refreshToken]);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(undefined);
    setRefreshToken(undefined);
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  // Callback pour mettre à jour le token après refresh
  const handleTokenRefresh = useCallback((newToken: string) => {
    if (newToken) {
      setAccessToken(newToken);
      localStorage.setItem(ACCESS_KEY, newToken);
    } else {
      // Refresh échoué, déconnecter
      logout();
    }
  }, [logout]);

  // Configurer les callbacks de refresh
  useEffect(() => {
    enterpriseApiClient.setOnTokenRefresh(handleTokenRefresh);
    personalApiClient.setOnTokenRefresh(handleTokenRefresh);
  }, [handleTokenRefresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await enterpriseApiClient.login({ email, password });
    if (!res.ok) {
      // Si c'est une erreur d'email non vérifié, on propage l'erreur
      if (res.status === 403 && (res.error === "email_not_verified" || res.error?.includes("email_not_verified"))) {
        throw new Error("Veuillez vérifier votre adresse email avant de vous connecter.");
      }
      return false;
    }
    
    setAccessToken(res.data.access_token);
    setRefreshToken(res.data.refresh_token);
    localStorage.setItem(ACCESS_KEY, res.data.access_token);
    localStorage.setItem(REFRESH_KEY, res.data.refresh_token);
    
    // Décoder le JWT pour récupérer l'ID utilisateur
    try {
      const tokenPayload = JSON.parse(atob(res.data.access_token.split('.')[1]));
      const userId = parseInt(tokenPayload.sub);
      const role = tokenPayload.role as string | undefined;
      setUser({ user_id: userId, email, role });
      localStorage.setItem(USER_KEY, JSON.stringify({ user_id: userId, email, role }));
    } catch (error) {
      console.error('Erreur lors du décodage du token:', error);
      setUser({ user_id: 0, email, role: undefined });
      localStorage.setItem(USER_KEY, JSON.stringify({ user_id: 0, email, role: undefined }));
    }
    return true;
  }, []);

  const register = useCallback(async (first_name: string, last_name: string, email: string, password: string) => {
    const res = await enterpriseApiClient.register({ first_name, last_name, email, password });
    if (!res.ok) return false;
    // L'inscription ne retourne plus de tokens - l'utilisateur doit d'abord vérifier son email
    // On retourne true pour indiquer que l'inscription a réussi
    return true;
  }, []);

  const value = useMemo(() => ({ user, accessToken, refreshToken, login, register, logout, isReady }), [user, accessToken, refreshToken, login, register, logout, isReady]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
