"use client";

import { ArrowLeft, Building2, Settings, Users } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ProjectLayout({ children }) {
  const params = useParams();
  const pathname = usePathname();
  const { projectId } = params;

  const navItems = [
    {
      href: `/admin/projects/${projectId}`,
      label: "Overview",
      icon: Settings,
      exact: true,
    },
    {
      href: `/admin/projects/${projectId}/structures`,
      label: "Structures",
      icon: Building2,
    },
    {
      href: `/admin/projects/${projectId}/users`,
      label: "Users",
      icon: Users,
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 py-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/projects">
                <ArrowLeft className="h-4 w-4 mr-2" />
                All Projects
              </Link>
            </Button>
          </div>
          <nav className="flex gap-2">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <main>{children}</main>
    </div>
  );
}
