import { Plus } from "lucide-react";
import { AddUserToProjectDialog } from "@/components/admin/AddUserToProjectDialog";
import { ProjectUsersTable } from "@/components/admin/ProjectUsersTable";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Project Users",
};

export default async function ProjectUsersPage({ params }) {
  const { projectId } = await params;

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Project Users</h1>
        <AddUserToProjectDialog projectId={projectId} />
      </div>
      <ProjectUsersTable projectId={projectId} />
    </div>
  );
}
