"use client";

import { Skeleton } from "@mui/material";
import {
  IconAdjustmentsHeart,
  IconBell,
  IconCategoryPlus,
  IconDashboard,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconInfoCircle,
  IconSearch,
  IconSettings,
  IconTableExport,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useParams } from "next/navigation";
import * as React from "react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { StructureSwitcher } from "@/components/structure-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import Logo from "../Logo";
import { NavStructures } from "../nav-structures";

const data = {
  navMain: [
    {
      title: "Casa",
      url: "",
      icon: IconDashboard,
    },
    {
      title: "Anagrafica",
      url: "anagrafica",
      icon: IconUsers,
    },
    {
      title: "Documenti Casa",
      url: "documenti",
      icon: IconFolder,
    },
    {
      title: "Esporta Accessi",
      url: "export",
      icon: IconTableExport,
    },
    /*  {
      title: "Gestione Community",
      url: "#",
      icon: IconFolder,
    },
    {
      title: "Sanitario",
      url: "#",
      icon: IconReport,
    },
    {
      title: "Lavoro",
      url: "#",
      icon: IconChartBar,
    },
    {
      title: "Legale",
      url: "#",
      icon: IconFileDescription,
    }, */
  ],
  navClouds: [
    {
      title: "Notifiche",
      icon: IconBell,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Eventi in Scadenza",
          url: "#",
        },
        {
          title: "Storico Notifiche",
          url: "#",
        },
      ],
    },
    {
      title: "Documenti",
      icon: IconFileWord,
      url: "#",
      items: [
        {
          title: "Personali",
          url: "#",
        },
        {
          title: "Amministrativi",
          url: "#",
        },
      ],
    },
  ],
  structures: [
    {
      title: "Informazioni Struttura",
      url: "admin",
      icon: IconInfoCircle,
    },
    {
      title: "Operatori",
      url: "admin/users",
      icon: IconUsersGroup,
    },
    {
      title: "Gestione Categorie Accessi",
      url: "admin/categories",
      icon: IconCategoryPlus,
    },
    {
      title: "Gestione Modulo Anagrafica",
      url: "admin/form-config",
      icon: IconAdjustmentsHeart,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ],
  documents: [
    /*  {
      name: "Archivio Generale",
      url: "#",
      icon: IconDatabase,
    },
    {
      name: "Report Comunità",
      url: "#",
      icon: IconReport,
    },
    {
      name: "Modulistica",
      url: "#",
      icon: IconFileWord,
    }, */
  ],
};

export function StructureSidebar({ ...props }) {
  const {
    user,
    loading,
    availableStructures,
    availableProjects,
    currentStructure,
    setCurrentStructure,
  } = useAuth();
  const { structureId } = useParams();

  React.useEffect(() => {
    if (structureId) {
      const structure = availableStructures.find((s) => s.id === structureId);
      if (structure) {
        setCurrentStructure(structure);
      }
    }
  }, [structureId, availableStructures, setCurrentStructure]);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/dashboard">
                <Logo className="!size-8" size={89} />
                <span className="text-base font-semibold">GPC - OBT</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            {availableStructures ? (
              <StructureSwitcher
                structures={availableStructures}
                projects={availableProjects}
                selectedStructure={currentStructure}
                user={user}
              />
            ) : (
              <Skeleton
                variant="rectangular"
                width={210}
                height={40}
                className="rounded-lg"
              />
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {currentStructure && (
          <>
            <NavMain items={data.navMain} structureId={currentStructure.id} />
            {!loading && user && currentStructure.admins.includes(user.uid) && (
              <NavStructures
                structureId={currentStructure.id}
                items={data.structures}
              />
            )}
          </>
        )}
        {/*   <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} loading={loading} />
      </SidebarFooter>
    </Sidebar>
  );
}
