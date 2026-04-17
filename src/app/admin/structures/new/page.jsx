import { CreateStructureForm } from "@/components/admin/CreateStructureForm";

export const metadata = {
  title: "Create Structure",
};

export default function CreateStructurePage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Create New Structure</h1>
      <CreateStructureForm />
    </div>
  );
}
