import { Plus } from "lucide-react";
import Link from "next/link";
import { UsersTable } from "@/components/admin/UsersTable";
import { Button } from "@/components/ui/button";
export const metadata = {
  title: "User Management",
};

export default function UsersPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Button asChild>
          <Link href="/admin/users/new">
            <Plus className="h-4 w-4 mr-2" />
            Create User
          </Link>
        </Button>
      </div>
      <UsersTable />
    </div>
  );
}
