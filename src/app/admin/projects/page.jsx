import { Plus } from "lucide-react";
import Link from "next/link";
import { ProjectsTable } from "@/components/admin/ProjectsTable";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Project Management",
};

export default function ProjectsPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Project Management</h1>
        <Button asChild>
          <Link href="/admin/projects/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Link>
        </Button>
      </div>
      <ProjectsTable />
    </div>
  );
}
