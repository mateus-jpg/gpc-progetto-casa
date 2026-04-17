import { CreateUserForm } from "@/components/admin/CreateUserForm";

export const metadata = {
  title: "Create User",
};

export default function CreateUserPage() {
  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <CreateUserForm />
    </div>
  );
}
