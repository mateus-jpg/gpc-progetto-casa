import { Plus } from "lucide-react";
import Link from "next/link";
import { AddExistingStructureToProjectDialog } from "@/components/admin/AddExistingStructureToProjectDialog";
import { ProjectStructuresTable } from "@/components/admin/ProjectStructuresTable";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Project Structures",
};

export default async function ProjectStructuresPage({ params }) {
  const { projectId } = await params;

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Project Structures</h1>
        <div className="flex gap-2">
          <AddExistingStructureToProjectDialog projectId={projectId} />
          <Button asChild>
            <Link href={`/admin/projects/${projectId}/structures/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Create Structure
            </Link>
          </Button>
        </div>
      </div>
      <ProjectStructuresTable projectId={projectId} />
    </div>
  );
}
