import { CreateProjectStructureForm } from "@/components/admin/CreateProjectStructureForm";

export const metadata = {
  title: "Create Structure in Project",
};

export default async function NewProjectStructurePage({ params }) {
  const { projectId } = await params;

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Create New Structure</h1>
      <CreateProjectStructureForm projectId={projectId} />
    </div>
  );
}
