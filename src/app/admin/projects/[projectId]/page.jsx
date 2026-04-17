import { Building2, Users } from "lucide-react";
import { notFound } from "next/navigation";
import {
  getProject,
  getStructuresByProject,
  getUsersByProject,
} from "@/actions/admin/project";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Project Overview",
};

export default async function ProjectPage({ params }) {
  const { projectId } = await params;

  const [projectResult, structuresResult, usersResult] = await Promise.all([
    getProject(projectId),
    getStructuresByProject(projectId),
    getUsersByProject(projectId),
  ]);

  if (!projectResult.success) {
    notFound();
  }

  const project = projectResult.project;
  const structures = structuresResult.success
    ? structuresResult.structures
    : [];
  const users = usersResult.success ? usersResult.users : [];
  const projectAdmins = users.filter((u) => u.isProjectAdmin);

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{project.name}</h1>
        {project.description && (
          <p className="text-muted-foreground mt-2">{project.description}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Structures</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{structures.length}</div>
            <p className="text-xs text-muted-foreground">
              Active structures in this project
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              Members in this project
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Project Admins
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectAdmins.length}</div>
            <p className="text-xs text-muted-foreground">
              Administrators for this project
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Structures</CardTitle>
            <CardDescription>
              Structures belonging to this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            {structures.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No structures yet. Create one to get started.
              </p>
            ) : (
              <ul className="space-y-2">
                {structures.slice(0, 5).map((structure) => (
                  <li
                    key={structure.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {structure.name}
                  </li>
                ))}
                {structures.length > 5 && (
                  <li className="text-sm text-muted-foreground">
                    +{structures.length - 5} more...
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project Administrators</CardTitle>
            <CardDescription>
              Users with admin access to this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projectAdmins.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No project admins assigned yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {projectAdmins.map((admin) => (
                  <li
                    key={admin.uid}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {admin.displayName || admin.email}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
