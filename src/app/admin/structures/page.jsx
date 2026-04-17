import { Plus } from "lucide-react";
import Link from "next/link";
import { StructuresTable } from "@/components/admin/StructuresTable";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Structure Management",
};

export default function StructuresPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Structure Management</h1>
        <Button asChild>
          <Link href="/admin/structures/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Structure
          </Link>
        </Button>
      </div>
      <StructuresTable />
    </div>
  );
}
