import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { accessToken, isReady } = useAuth();
  if (!isReady) return null; // attendre l'hydratation avant de décider
  if (!accessToken) return <Navigate to="/auth" replace />;
  return children;
};

export const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const { accessToken, isReady, user } = useAuth();
  if (!isReady) return null;
  if (!accessToken) return <Navigate to="/auth" replace />;
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
};


