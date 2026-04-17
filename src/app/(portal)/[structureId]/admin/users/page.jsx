import { StructureUsersTable } from "@/components/admin/StructureUsersTable";
import { requireUser, verifyStructureAdmin } from "@/utils/server-auth";

export const metadata = {
  title: "Structure Users",
};

export default async function StructureUsersPage({ params }) {
  const { structureId } = await params;

  // Server-side permission check
  try {
    const { userUid } = await requireUser();
    await verifyStructureAdmin({ userUid, structureId });
  } catch (e) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-xl font-bold text-destructive">Access Denied</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-6 mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Manage members and administrators for this structure.
        </p>
      </div>
      <StructureUsersTable />
    </div>
  );
}
