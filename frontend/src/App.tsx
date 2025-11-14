import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import PersonalProjects from "./pages/PersonalProjects";
import PersonalProjectDetail from "./pages/PersonalProjectDetail";
import MaturityEvaluation from "./pages/MaturityEvaluation";
import MaturityResults from "./pages/MaturityResults";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import { ProtectedRoute, AdminRoute } from "@/components/ProtectedRoute";
import AdminDashboard from "./pages/AdminDashboard";
import { Navigate } from "react-router-dom";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="chatbot-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/" element={<Navigate to="/personal" replace />} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/personal" element={<ProtectedRoute><PersonalProjects /></ProtectedRoute>} />
            <Route path="/personal/project/:projectId" element={<ProtectedRoute><PersonalProjectDetail /></ProtectedRoute>} />
            <Route path="/maturity" element={<ProtectedRoute><MaturityEvaluation /></ProtectedRoute>} />
        <Route path="/maturity/results" element={<ProtectedRoute><MaturityResults /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
