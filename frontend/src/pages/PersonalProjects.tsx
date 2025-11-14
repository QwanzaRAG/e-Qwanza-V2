import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreVertical, Calendar, FileText, MessageSquare, Globe, Lock } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { PersonalProject } from "@/types/Project";
import { personalProjectsApi, PersonalProject as ApiPersonalProject } from "@/services/personalProjectsApi";
import { ApiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type FilterType = "Tout" | "Public" | "Privé";

const PersonalProjects = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [projects, setProjects] = useState<PersonalProject[]>([]);
  const [publicProjects, setPublicProjects] = useState<PersonalProject[]>([]);
  const [publicProjectsLoading, setPublicProjectsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("Tout");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreatePublicDialogOpen, setIsCreatePublicDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectVisibility, setNewProjectVisibility] = useState<'private' | 'public'>('private');
  const [isCreating, setIsCreating] = useState(false);

  // Charger les projets depuis l'API
  useEffect(() => {
    loadProjects();
    loadPublicProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const apiProjects = await personalProjectsApi.getProjects();
      
      // Récupérer les compteurs pour chaque projet
      const projectsWithCounts = await Promise.all(
        apiProjects.map(async (project: ApiPersonalProject) => {
          const projectId = project.project_id;
          
          // Créer un client API temporaire pour ce projet
          const tempApiClient = new ApiClient();
          tempApiClient.setProjectId(projectId);
          tempApiClient.setAuthToken(localStorage.getItem('auth_access_token') || undefined);
          
          // Récupérer le nombre de documents (assets)
          let documentCount = 0;
          try {
            const assetsRes = await tempApiClient.listAssets();
            if (assetsRes.ok) {
              documentCount = assetsRes.data.assets.length;
            }
          } catch (error) {
            console.warn(`Erreur lors du chargement des assets pour le projet ${projectId}:`, error);
          }
          
          // Récupérer le nombre de conversations (messages)
          let messageCount = 0;
          try {
            const conversationsRes = await tempApiClient.listConversations();
            if (conversationsRes.ok) {
              messageCount = conversationsRes.data.length;
            }
          } catch (error) {
            console.warn(`Erreur lors du chargement des conversations pour le projet ${projectId}:`, error);
          }
          
          return {
            id: project.project_id.toString(),
            name: project.nom_projet || 'Projet sans nom',
            description: project.description_projet || '',
            createdAt: new Date(project.created_at),
            updatedAt: new Date(project.updated_at),
            lastActivity: new Date(project.updated_at),
            documentCount,
            messageCount,
            visibility: project.visibility || 'private',
          };
        })
      );
      
      setProjects(projectsWithCounts);
    } catch (error) {
      console.error('Erreur lors du chargement des projets:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les projets",
        variant: "destructive",
      });
    }
  };

  // Créer un nouveau projet
  const handleCreateProject = async (visibility: 'private' | 'public' = 'private') => {
    if (!newProjectName.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du projet est requis.",
        variant: "destructive",
      });
      return;
    }

    // Vérifier que seuls les admins peuvent créer des projets publics
    if (visibility === 'public' && !isAdmin) {
      toast({
        title: "Erreur",
        description: "Seuls les administrateurs peuvent créer des projets publics.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const newProject = await personalProjectsApi.createProject({
        nom_projet: newProjectName.trim(),
        description_projet: newProjectDescription.trim(),
        visibility: visibility,
      });

      // Recharger la liste des projets
      await loadProjects();
      if (visibility === 'public') {
        await loadPublicProjects();
      }

      // Réinitialiser le formulaire
      setNewProjectName("");
      setNewProjectDescription("");
      setNewProjectVisibility('private');
      setIsCreateDialogOpen(false);
      setIsCreatePublicDialogOpen(false);

      toast({
        title: "Projet créé",
        description: `Le projet "${newProject.nom_projet}" a été créé avec succès (${visibility === 'public' ? 'public' : 'privé'}).`,
      });
    } catch (error: any) {
      console.error('Erreur lors de la création du projet:', error);
      const errorMessage = error?.message || "Une erreur est survenue lors de la création du projet.";
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Supprimer un projet
  const handleDeleteProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    try {
      await personalProjectsApi.deleteProject(parseInt(projectId));
      
      // Recharger la liste des projets
      await loadProjects();

      toast({
        title: "Projet supprimé",
        description: `Le projet "${project.name}" a été supprimé.`,
      });
    } catch (error) {
      console.error('Erreur lors de la suppression du projet:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le projet",
        variant: "destructive",
      });
    }
  };

  // Ouvrir un projet
  const handleOpenProject = (projectId: string) => {
    navigate(`/personal/project/${projectId}`);
  };

  // Charger les projets publics
  const loadPublicProjects = async () => {
    setPublicProjectsLoading(true);
    try {
      const result = await personalProjectsApi.getPublicProjects(1, 50);
      
      // Récupérer les compteurs pour chaque projet public
      const projectsWithCounts = await Promise.all(
        result.projects.map(async (project: ApiPersonalProject) => {
          const projectId = project.project_id;
          
          // Créer un client API temporaire pour ce projet
          const tempApiClient = new ApiClient();
          tempApiClient.setProjectId(projectId);
          tempApiClient.setAuthToken(localStorage.getItem('auth_access_token') || undefined);
          
          // Récupérer le nombre de documents (assets)
          let documentCount = 0;
          try {
            const assetsRes = await tempApiClient.listAssets();
            if (assetsRes.ok) {
              documentCount = assetsRes.data.assets.length;
            }
          } catch (error) {
            console.warn(`Erreur lors du chargement des assets pour le projet ${projectId}:`, error);
          }
          
          // Récupérer le nombre de conversations (messages)
          let messageCount = 0;
          try {
            const conversationsRes = await tempApiClient.listConversations();
            if (conversationsRes.ok) {
              messageCount = conversationsRes.data.length;
            }
          } catch (error) {
            console.warn(`Erreur lors du chargement des conversations pour le projet ${projectId}:`, error);
          }
          
          return {
            id: project.project_id.toString(),
            name: project.nom_projet || 'Projet sans nom',
            description: project.description_projet || '',
            createdAt: new Date(project.created_at),
            updatedAt: new Date(project.updated_at),
            lastActivity: new Date(project.updated_at),
            documentCount,
            messageCount,
            visibility: project.visibility || 'public',
          };
        })
      );
      
      setPublicProjects(projectsWithCounts);
    } catch (error) {
      console.error('Erreur lors du chargement des projets publics:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les projets publics",
        variant: "destructive",
      });
    } finally {
      setPublicProjectsLoading(false);
    }
  };

  // Obtenir les projets selon le filtre actif
  const getProjectsByFilter = (): PersonalProject[] => {
    let projectsToShow: PersonalProject[] = [];
    
    switch (activeFilter) {
      case "Tout":
        // Combiner les projets publics et privés, en évitant les doublons
        const projectIds = new Set<string>();
        projectsToShow = [];
        
        // Ajouter d'abord les projets publics
        publicProjects.forEach(project => {
          if (!projectIds.has(project.id)) {
            projectIds.add(project.id);
            projectsToShow.push(project);
          }
        });
        
        // Ensuite ajouter les projets privés
        projects.forEach(project => {
          if (!projectIds.has(project.id)) {
            projectIds.add(project.id);
            projectsToShow.push(project);
          }
        });
        break;
      case "Public":
        projectsToShow = publicProjects;
        break;
      case "Privé":
        projectsToShow = projects;
        break;
      default:
        // Par défaut, afficher tout
        const allProjectIds = new Set<string>();
        projectsToShow = [];
        
        publicProjects.forEach(project => {
          if (!allProjectIds.has(project.id)) {
            allProjectIds.add(project.id);
            projectsToShow.push(project);
          }
        });
        
        projects.forEach(project => {
          if (!allProjectIds.has(project.id)) {
            allProjectIds.add(project.id);
            projectsToShow.push(project);
          }
        });
    }
    
    return projectsToShow;
  };

  // Filtrer les projets selon la recherche
  const filteredProjects = getProjectsByFilter().filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Filtrer les projets publics pour la recherche
  const filteredPublicProjects = publicProjects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Filtrer les projets privés pour la recherche
  const filteredPrivateProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-background">
        {/* Main Content */}
        <main className="max-w-7xl mx-auto p-6">
          {/* Filter Buttons */}
          <div className="mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveFilter("Tout")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === "Tout"
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Tout
              </button>
              <button
                onClick={() => setActiveFilter("Public")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === "Public"
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Public
              </button>
              <button
                onClick={() => setActiveFilter("Privé")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === "Privé"
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Privé
              </button>
            </div>
          </div>

          {/* Header pour le filtre Privé */}
          {activeFilter === "Privé" && (
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Mes Projets Personnels</h1>
              <p className="text-muted-foreground">
                Gérez vos projets et documents personnels
              </p>
            </div>
          )}

          {/* Search and Create Section */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Rechercher un projet..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-80"
                  />
                </div>
                <Badge variant="secondary" className="text-sm">
                  {filteredProjects.length} projet{filteredProjects.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            
            <div className="flex items-center gap-2">
              {/* Bouton pour créer un projet privé (tous les utilisateurs) */}
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Lock className="w-4 h-4 mr-2" />
                    Créer un projet privé
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Créer un nouveau projet privé</DialogTitle>
                    <DialogDescription>
                      Donnez un nom et une description à votre nouveau projet privé.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nom du projet *</Label>
                      <Input
                        id="name"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="Mon nouveau projet"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description (optionnel)</Label>
                      <Textarea
                        id="description"
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.target.value)}
                        placeholder="Description de votre projet..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setNewProjectName("");
                        setNewProjectDescription("");
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={() => handleCreateProject('private')}
                      disabled={isCreating || !newProjectName.trim()}
                    >
                      {isCreating ? "Création..." : "Créer"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Bouton pour créer un projet public (admin uniquement) */}
              {isAdmin && (
                <Dialog open={isCreatePublicDialogOpen} onOpenChange={setIsCreatePublicDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90">
                      <Globe className="w-4 h-4 mr-2" />
                      Créer un projet public
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Créer un nouveau projet public</DialogTitle>
                      <DialogDescription>
                        Créez un projet public qui sera visible par tous les utilisateurs.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="public-name">Nom du projet *</Label>
                        <Input
                          id="public-name"
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          placeholder="Projet public de l'entreprise"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="public-description">Description (optionnel)</Label>
                        <Textarea
                          id="public-description"
                          value={newProjectDescription}
                          onChange={(e) => setNewProjectDescription(e.target.value)}
                          placeholder="Description du projet public..."
                          rows={3}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="visibility">Visibilité *</Label>
                        <Select
                          value={newProjectVisibility}
                          onValueChange={(value: 'private' | 'public') => setNewProjectVisibility(value)}
                        >
                          <SelectTrigger id="visibility">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">
                              <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4" />
                                Public (visible par tous)
                              </div>
                            </SelectItem>
                            <SelectItem value="private">
                              <div className="flex items-center gap-2">
                                <Lock className="w-4 h-4" />
                                Privé (visible uniquement par vous)
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsCreatePublicDialogOpen(false);
                          setNewProjectName("");
                          setNewProjectDescription("");
                          setNewProjectVisibility('private');
                        }}
                      >
                        Annuler
                      </Button>
                      <Button
                        onClick={() => handleCreateProject(newProjectVisibility)}
                        disabled={isCreating || !newProjectName.trim()}
                      >
                        {isCreating ? "Création..." : "Créer"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

        {/* Loading State */}
        {publicProjectsLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground mt-4">Chargement des projets...</p>
          </div>
        ) : activeFilter === "Tout" ? (
          <>
            {/* Section Projets Publics */}
            <div className="mb-12">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-foreground mb-2">Projets Entreprise</h2>
                <p className="text-muted-foreground">
                  Projets publics partagés par l'entreprise
                </p>
              </div>

              {filteredPublicProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredPublicProjects.map((project) => (
                    <Card 
                      key={project.id} 
                      className="hover:shadow-lg transition-shadow cursor-pointer group"
                      onClick={() => handleOpenProject(project.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-lg truncate" title={project.name}>
                                {project.name}
                              </CardTitle>
                              {project.visibility === 'public' ? (
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <Globe className="w-3 h-3" />
                                  Public
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  Privé
                                </Badge>
                              )}
                            </div>
                            {project.description && (
                              <CardDescription className="mt-1 line-clamp-2">
                                {project.description}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              <span>{project.documentCount} document{project.documentCount !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-4 h-4" />
                              <span>{project.messageCount} conversation{project.messageCount !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>
                              Créé le {project.createdAt.toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-card/50 rounded-lg border border-border">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Aucun projet public disponible</h3>
                  <p className="text-muted-foreground">
                    Il n'y a actuellement aucun projet public partagé par l'entreprise.
                  </p>
                </div>
              )}
            </div>

            {/* Séparateur */}
            <div className="border-t border-border my-8"></div>

            {/* Section Projets Privés */}
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-foreground mb-2">Mes Projets Personnels</h2>
                <p className="text-muted-foreground">
                  Gérez vos projets et documents personnels
                </p>
              </div>

              {/* Projects Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Create Project Card */}
                <Card 
                  className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer group"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <Plus className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Créer un projet</h3>
                    <p className="text-sm text-muted-foreground">
                      Commencez un nouveau projet avec vos documents
                    </p>
                  </CardContent>
                </Card>

                {/* Project Cards */}
                {filteredPrivateProjects.map((project) => (
                  <Card 
                    key={project.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => handleOpenProject(project.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-lg truncate" title={project.name}>
                              {project.name}
                            </CardTitle>
                            {project.visibility === 'public' ? (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                Public
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                Privé
                              </Badge>
                            )}
                          </div>
                          {project.description && (
                            <CardDescription className="mt-1 line-clamp-2">
                              {project.description}
                            </CardDescription>
                          )}
                        </div>
                        {/* Menu déroulant seulement pour les projets privés ou si admin */}
                        {(project.visibility === 'private' || isAdmin) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenProject(project.id)}>
                                Ouvrir
                              </DropdownMenuItem>
                              {/* Seuls les admins peuvent supprimer les projets publics */}
                              {(project.visibility === 'private' || isAdmin) && (
                                <DropdownMenuItem
                                  onClick={() => handleDeleteProject(project.id)}
                                  className="text-destructive"
                                >
                                  Supprimer
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            <span>{project.documentCount} document{project.documentCount !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            <span>{project.messageCount} conversation{project.messageCount !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>
                            Créé le {project.createdAt.toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Projects Grid pour Public ou Privé */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {/* Create Project Card - Only show for Private filter */}
              {activeFilter === "Privé" && (
                <Card 
                  className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer group"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <Plus className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Créer un projet</h3>
                    <p className="text-sm text-muted-foreground">
                      Commencez un nouveau projet avec vos documents
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Project Cards */}
              {filteredProjects.map((project) => {
                // Déterminer si c'est un projet public ou privé
                const isPublicProject = publicProjects.some(p => p.id === project.id);
                
                return (
                  <Card 
                    key={project.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => handleOpenProject(project.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-lg truncate" title={project.name}>
                              {project.name}
                            </CardTitle>
                            {project.visibility === 'public' ? (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                Public
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                Privé
                              </Badge>
                            )}
                          </div>
                          {project.description && (
                            <CardDescription className="mt-1 line-clamp-2">
                              {project.description}
                            </CardDescription>
                          )}
                        </div>
                        {/* Menu déroulant seulement pour les projets privés ou si admin */}
                        {(!isPublicProject || isAdmin) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenProject(project.id)}>
                                Ouvrir
                              </DropdownMenuItem>
                              {/* Seuls les admins peuvent supprimer les projets publics */}
                              {(!isPublicProject || isAdmin) && (
                                <DropdownMenuItem
                                  onClick={() => handleDeleteProject(project.id)}
                                  className="text-destructive"
                                >
                                  Supprimer
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            <span>{project.documentCount} document{project.documentCount !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            <span>{project.messageCount} conversation{project.messageCount !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>
                            Créé le {project.createdAt.toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Empty State pour Public ou Privé */}
            {(activeFilter === "Public" || activeFilter === "Privé") && (
              <>
                {filteredProjects.length === 0 && searchTerm && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Aucun projet trouvé</h3>
                    <p className="text-muted-foreground">
                      Aucun projet ne correspond à votre recherche "{searchTerm}".
                    </p>
                  </div>
                )}

                {filteredProjects.length === 0 && !searchTerm && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      {activeFilter === "Public" 
                        ? "Aucun projet public disponible"
                        : "Aucun projet personnel"}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {activeFilter === "Public"
                        ? "Il n'y a actuellement aucun projet public partagé par l'entreprise."
                        : "Créez votre premier projet pour commencer à organiser vos documents."}
                    </p>
                    {activeFilter === "Privé" && (
                      <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Créer votre premier projet
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
      </div>
    </Layout>
  );
};

export default PersonalProjects;
