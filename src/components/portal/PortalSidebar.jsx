"use client";

import {
  IconBell,
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";
import Link from "next/link";
import * as React from "react";
import { NavDocuments } from "@/components/nav-documents";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
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

const data = {
  navMain: [],
  navClouds: [
    /* {
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
    },*/
  ],
  navSecondary: [
    /* {
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
    }, */
  ],
  documents: [
    /* {
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
    },  */
  ],
};

export function PortalSideBar({ ...props }) {
  const {
    user,
    loading,
    availableStructures,
    availableProjects,
    setCurrentStructure,
    currentStructure,
  } = useAuth();

  React.useEffect(() => {
    if (availableStructures && availableStructures.length === 1) {
      setCurrentStructure(availableStructures[0]);
      // If there's only one structure, set it as the current structure
      // push to /[structureId] route
    } else {
      setCurrentStructure(null);
    }
  }, [availableStructures]);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="#">
                <Logo className="!size-8" size={89} />
                <span className="text-base font-semibold">GPC - OBT</span>
              </Link>
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
        {/* <NavMain items={data.navMain} /> */}
        {/*  <NavDocuments items={data.documents} /> */}
        {/*   <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} loading={loading} />
      </SidebarFooter>
    </Sidebar>
  );
}
