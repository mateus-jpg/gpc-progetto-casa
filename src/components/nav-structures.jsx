"use client";

import clsx from "clsx";
import { usePathname, useRouter } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
export function NavStructures({ items, structureId }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Struttura</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.name || item.title}>
            <SidebarMenuButton
              tooltip={item.title}
              onClick={() => router.push(`/${structureId}/${item.url}`)}
              disabled={pathname === `/${structureId}/${item.url}`}
              isActive={pathname === `/${structureId}/${item.url}`}
              variant={
                pathname === `/${structureId}/${item.url}`
                  ? "outline"
                  : "default"
              }
              className={clsx(
                "disabled:font-bold  disabled:text-foreground disabled:text",
                item.className,
              )}
            >
              <item.icon />
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
