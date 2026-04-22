"use client";

import { IconCirclePlusFilled } from "@tabler/icons-react";
import clsx from "clsx";
import { usePathname, useRouter } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
export function NavMain({ structureId, items }) {
  if (!structureId) {
    structureId = "";
  }
  const router = useRouter();
  const pathname = usePathname();

  const getItemUrl = (item) =>
    item.url ? `/${structureId}/${item.url}` : `/${structureId}`;

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip="Quick Create"
              onClick={() => router.push(`/${structureId}/new`)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
            >
              <IconCirclePlusFilled />
              <span>Nuovo Accesso</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => {
            const itemUrl = getItemUrl(item);

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  onClick={() => router.push(itemUrl)}
                  disabled={pathname === itemUrl}
                  isActive={pathname === itemUrl}
                  variant={pathname === itemUrl ? "outline" : "default"}
                  className={clsx(
                    "disabled:font-bold  disabled:text-black disabled:text",
                    item.className,
                  )}
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
