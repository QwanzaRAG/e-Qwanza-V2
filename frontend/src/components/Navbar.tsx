import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { 
  Settings, 
  LogOut, 
  User, 
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
  Menu,
  X,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface NavbarProps {
  sidebarOpen?: boolean;
  onSidebarToggle?: () => void;
}

const Navbar = ({ sidebarOpen, onSidebarToggle }: NavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { logout, user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Déterminer si on est sur une page personnelle
  const isPersonalPage = location.pathname.startsWith('/personal');
  const isAuthPage = location.pathname === '/auth';

  // Gérer la déconnexion
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Déconnexion via le contexte (supprime tokens + état)
      logout();

      // Rediriger vers la page d'authentification
      navigate('/auth');
      
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur de déconnexion",
        description: "Une erreur est survenue lors de la déconnexion.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Gérer les paramètres
  const handleSettings = () => {
    toast({
      title: "Paramètres",
      description: "Fonctionnalité de paramètres à venir.",
    });
  };

  // Navigation
  const handlePersonalProjects = () => {
    navigate('/personal');
    setMobileMenuOpen(false);
  };

  const handleMaturity = () => {
    navigate('/maturity');
    setMobileMenuOpen(false);
  };

  const handleAdmin = () => {
    navigate('/admin');
    setMobileMenuOpen(false);
  };

  // Ne pas afficher la navbar sur la page d'authentification
  if (isAuthPage) {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-foreground">
                e-Qwanza
              </h1>
            </div>
          </div>

          {/* Navigation principale - Desktop */}
          <div className="hidden md:flex items-center space-x-1">
            <Button
              variant={isPersonalPage ? 'default' : 'ghost'}
              size="sm"
              onClick={handlePersonalProjects}
              className="flex items-center space-x-2"
            >
              <FolderOpen className="w-4 h-4" />
              <span>RAG</span>
            </Button>

            <Button
              variant={location.pathname.startsWith('/maturity') ? 'default' : 'ghost'}
              size="sm"
              onClick={handleMaturity}
              className="flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Évaluation de maturité</span>
            </Button>

            {user?.role === 'ADMIN' && (
              <Button
                variant={location.pathname.startsWith('/admin') ? 'default' : 'ghost'}
                size="sm"
                onClick={handleAdmin}
                className="flex items-center space-x-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Button>
            )}
          </div>

          {/* Actions - Profil et Thème */}
          <div className="flex items-center space-x-2">
            {/* Toggle de thème */}
            <ThemeToggle />

            {/* Menu de profil */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/profile.png" alt="Profil" />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.email || 'Utilisateur'}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email || 'non connecté'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSettings}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Paramètres</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Menu mobile */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Menu mobile */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card/95 backdrop-blur-sm">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Button
                variant={isPersonalPage ? 'default' : 'ghost'}
                size="sm"
                onClick={handlePersonalProjects}
                className="w-full justify-start flex items-center space-x-2"
              >
                <FolderOpen className="w-4 h-4" />
                <span>RAG</span>
              </Button>

              <Button
                variant={location.pathname.startsWith('/maturity') ? 'default' : 'ghost'}
                size="sm"
                onClick={handleMaturity}
                className="w-full justify-start flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>Évaluation de maturité</span>
              </Button>

              {user?.role === 'ADMIN' && (
                <Button
                  variant={location.pathname.startsWith('/admin') ? 'default' : 'ghost'}
                  size="sm"
                  onClick={handleAdmin}
                  className="w-full justify-start flex items-center space-x-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
