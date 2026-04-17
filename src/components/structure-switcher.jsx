"use client";
import {
  Building2,
  ChevronsUpDown,
  FolderOpen,
  Plus,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useSWRConfig } from "swr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { clearStructureCache } from "@/lib/swr-config";

export function StructureSwitcher({
  structures,
  projects = [],
  selectedStructure,
  user,
}) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { mutate } = useSWRConfig();

  const handleStructureChange = async (structureId) => {
    // Clear structure-specific cache before navigating
    await clearStructureCache(mutate);
    router.push(`/${structureId}`);
  };

  const isAdmin = user?.role === "admin";
  const isProjectAdmin = projects.some((p) => p.admins?.includes(user?.uid));

  // Group structures by project
  const groupedStructures = React.useMemo(() => {
    const groups = new Map();
    const noProjectStructures = [];

    structures.forEach((structure) => {
      if (structure.projectId) {
        const project = projects.find((p) => p.id === structure.projectId);
        if (project) {
          if (!groups.has(project.id)) {
            groups.set(project.id, {
              project,
              structures: [],
            });
          }
          groups.get(project.id).structures.push(structure);
        } else {
          noProjectStructures.push(structure);
        }
      } else {
        noProjectStructures.push(structure);
      }
    });

    return {
      byProject: Array.from(groups.values()),
      noProject: noProjectStructures,
    };
  }, [structures, projects]);

  const hasProjects = groupedStructures.byProject.length > 0;

  let activeStructure = selectedStructure;
  if (!selectedStructure) {
    activeStructure = { name: "seleziona struttura" };
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {activeStructure.name}
                </span>
                {selectedStructure?.projectId && (
                  <span className="truncate text-xs text-muted-foreground">
                    {
                      projects.find((p) => p.id === selectedStructure.projectId)
                        ?.name
                    }
                  </span>
                )}
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Strutture
            </DropdownMenuLabel>

            {/* Structures grouped by project */}
            {hasProjects &&
              groupedStructures.byProject.map(
                ({ project, structures: projectStructures }) => (
                  <DropdownMenuSub key={project.id}>
                    <DropdownMenuSubTrigger className="gap-2 p-2">
                      <FolderOpen className="size-4 text-muted-foreground" />
                      <span className="font-medium">{project.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {projectStructures.length}
                      </span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {projectStructures.map((structure) => (
                        <DropdownMenuItem
                          key={structure.id}
                          onClick={() => handleStructureChange(structure.id)}
                          className="gap-2 p-2"
                        >
                          <Building2 className="size-4 text-muted-foreground" />
                          {structure.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ),
              )}

            {/* Structures without project */}
            {groupedStructures.noProject.length > 0 && (
              <>
                {hasProjects && <DropdownMenuSeparator />}
                {groupedStructures.noProject.map((structure) => (
                  <DropdownMenuItem
                    key={structure.id}
                    onClick={() => handleStructureChange(structure.id)}
                    className="gap-2 p-2"
                  >
                    <Building2 className="size-4 text-muted-foreground" />
                    {structure.name}
                  </DropdownMenuItem>
                ))}
              </>
            )}

            {/* Admin actions */}
            {(isAdmin || isProjectAdmin) && (
              <>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <>
                    <DropdownMenuItem
                      className="gap-2 p-2"
                      onClick={() => router.push("/admin/projects")}
                    >
                      <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                        <FolderOpen className="size-4" />
                      </div>
                      <div className="font-medium">Gestisci progetti</div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2 p-2"
                      onClick={() => router.push("/admin/structures/new")}
                    >
                      <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                        <Plus className="size-4" />
                      </div>
                      <div className="font-medium">Crea struttura</div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2 p-2"
                      onClick={() => router.push("/admin/structures")}
                    >
                      <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                        <Settings className="size-4" />
                      </div>
                      <div className="font-medium">Gestisci strutture</div>
                    </DropdownMenuItem>
                  </>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
