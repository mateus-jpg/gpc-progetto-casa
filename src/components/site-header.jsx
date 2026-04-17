"use client"; // 👈 Add this directive to use hooks

import { usePathname } from "next/navigation"; // 👈 Import the hook
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

// A helper map to get the title from the pathname
const PATH_TITLES = {
  "/": "Dashboard",
  "/anagrafica": "Anagrafica",
  "/gestione-community": "Gestione Community",
  "/sanitario": "Sanitario",
  "/lavoro": "Lavoro",
  "/legale": "Legale",
  "/documenti/archivio-generale": "Archivio Generale",
  "/documenti/report-comunita": "Report Comunità",
  "/documenti/modulistica": "Modulistica",
};

// A function to get the title, with a fallback
const getTitleFromPath = (path) => {
  if (PATH_TITLES[path]) {
    return PATH_TITLES[path];
  }
  // Fallback for nested or unknown routes
  const pathSegments = path.split("/").filter(Boolean);
  if (pathSegments.length > 0) {
    // Capitalize the first letter of the last segment
    const lastSegment = pathSegments[pathSegments.length - 1];
    return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
  }
  return "GPC"; // Default fallback
};

export function SiteHeader() {
  const pathname = usePathname(); // 👈 Get the current path
  const title = getTitleFromPath(pathname); // 👈 Get the dynamic title

  return (
    <header className="flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        {/* Replace the static h1 with the dynamic title */}
        <h1 className="text-base font-medium">{title}</h1>
      </div>
    </header>
  );
}
