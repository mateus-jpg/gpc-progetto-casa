import { CreateProjectForm } from "@/components/admin/CreateProjectForm";

export const metadata = {
  title: "Create New Project",
};

export default function NewProjectPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Create New Project</h1>
      <CreateProjectForm />
    </div>
  );
}
