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
  IconUsersGroup,
} from "@tabler/icons-react";
import * as React from "react";

import { NavDocuments } from "@/components/nav-documents";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
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
import Logo from "./Logo";
import { NavStructures, NavStrutture } from "./nav-structures";

const data = {
  navMain: [
    {
      title: "Anagrafica",
      url: "anagrafica",
      icon: IconUsers,
    },
    {
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
    },
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
  structures: [
    {
      title: "Operatori",
      url: "#",
      name: "operators",
      icon: IconUsersGroup,
    },
  ],
  documents: [
    {
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
    },
  ],
};

export function PortalSideBar({ ...props }) {
  const { user, loading } = useAuth();

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <Logo className="!size-8" size={89} />
                <span className="text-base font-semibold">GPC - OBT</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} structureId={structureId} />
        <NavStructures items={data.structures} />
        {/*   <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        {user ? <NavUser user={user} /> : <div className="p-4">Loading...</div>}
      </SidebarFooter>
    </Sidebar>
  );
}
