import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="font-semibold text-lg">Admin Dashboard</div>
          <nav className="flex items-center gap-4">
            <Button asChild variant="ghost">
              <Link href="/admin/projects">Projects</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/admin/users">Users</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/admin/structures">Structures</Link>
            </Button>

            <Button asChild variant="ghost">
              <Link href="/">Back to App</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
