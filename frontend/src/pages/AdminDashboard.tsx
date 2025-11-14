import { useEffect, useMemo, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { enterpriseApiClient } from "@/lib/api";
import { Trash2, Plus } from "lucide-react";

type UserRow = { user_id: number; first_name: string; last_name: string; email: string; user_role: string };
type ProjectRow = { project_id: number; project_uuid: string; nom_projet: string; description_projet: string; user_id: number; created_at?: string; updated_at?: string };

const AdminDashboard = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'projects'>('users');
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");

  const canCreate = useMemo(() => firstName && lastName && email && password, [firstName, lastName, email, password]);

  // Filtrer les utilisateurs par rôle
  const filteredUsers = useMemo(() => {
    if (roleFilter === "ALL") return users;
    return users.filter(user => user.user_role === roleFilter);
  }, [users, roleFilter]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await enterpriseApiClient.listUsers();
      if (!res.ok) throw new Error((res as { ok: false; error: string }).error);
      setUsers(res.data);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Impossible de charger les utilisateurs.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const res = await enterpriseApiClient.listAllProjects();
      if (!res.ok) throw new Error((res as { ok: false; error: string }).error);
      setProjects(res.data);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Impossible de charger les projets.", variant: "destructive" });
    } finally {
      setProjectsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadUsers();
    loadProjects();
  }, [loadUsers, loadProjects]);

  const handleCreate = useCallback(async () => {
    try {
      const res = await enterpriseApiClient.createUser({ first_name: firstName, last_name: lastName, email, password, user_role: role });
      if (!res.ok) throw new Error((res as { ok: false; error: string }).error);
      toast({ title: "Utilisateur créé", description: `${email} ajouté.` });
      setFirstName(""); setLastName(""); setEmail(""); setPassword(""); setRole("USER");
      await loadUsers();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Création échouée", variant: "destructive" });
    }
  }, [firstName, lastName, email, password, role, loadUsers, toast]);

  const handleDelete = useCallback(async (userId: number) => {
    try {
      const res = await enterpriseApiClient.deleteUser(userId);
      if (!res.ok) throw new Error((res as { ok: false; error: string }).error);
      toast({ title: "Utilisateur supprimé", description: `ID ${userId} supprimé.` });
      await loadUsers();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Suppression échouée", variant: "destructive" });
    }
  }, [loadUsers, toast]);

  return (
    <Layout className="h-screen">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Tableau de bord Admin</h1>
          <div className="flex gap-2">
            <Button variant={activeTab === 'users' ? 'default' : 'outline'} onClick={() => setActiveTab('users')}>Utilisateurs</Button>
            <Button variant={activeTab === 'projects' ? 'default' : 'outline'} onClick={() => setActiveTab('projects')}>Projets</Button>
          </div>
        </div>

        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Utilisateurs</h2>
              <div className="flex gap-2">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filtrer par rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tous les rôles</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="MODERATOR">Moderator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} 
                {roleFilter !== "ALL" && ` (${roleFilter})`}
              </div>
              <div className="flex gap-2">
            <Input placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-36" />
            <Input placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-36" />
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-56" />
            <Input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} className="w-48" />
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="MODERATOR">Moderator</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleCreate} disabled={!canCreate}>
              <Plus className="w-4 h-4 mr-2" /> Ajouter
            </Button>
          </div>
            </div>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell>{u.user_id}</TableCell>
                      <TableCell>{u.first_name} {u.last_name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell className="capitalize">{u.user_role}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(u.user_id)}>
                          <Trash2 className="w-4 h-4 mr-1" /> Supprimer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        {loading ? "Chargement..." : roleFilter === "ALL" ? "Aucun utilisateur" : `Aucun utilisateur avec le rôle ${roleFilter}`}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Projets</h2>
            </div>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Création</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p) => (
                    <TableRow key={p.project_id}>
                      <TableCell>{p.project_id}</TableCell>
                      <TableCell>{p.nom_projet || '-'}</TableCell>
                      <TableCell className="max-w-[400px] truncate" title={p.description_projet || ''}>{p.description_projet || '-'}</TableCell>
                      <TableCell>{p.user_id}</TableCell>
                      <TableCell>{p.created_at ? new Date(p.created_at).toLocaleString('fr-FR') : '-'}</TableCell>
                    </TableRow>
                  ))}
                  {projects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        {projectsLoading ? "Chargement..." : "Aucun projet"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminDashboard;


