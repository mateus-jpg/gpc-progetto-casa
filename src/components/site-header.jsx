"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

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

const SEGMENT_TITLES = {
  admin: "Informazioni Struttura",
  anagrafica: "Anagrafica",
  autovalutazione: "Autovalutazione",
  categories: "Gestione Categorie Accessi",
  documenti: "Documenti Casa",
  edit: "Modifica Scheda",
  export: "Esporta Accessi",
  files: "File e Documenti",
  "form-config": "Gestione Modulo Anagrafica",
  monitoraggio: "Monitoraggio Individuale",
  "progetto-personalizzato": "Progetto Personalizzato",
  registrazione: "Registrazione",
  users: "Operatori",
};

function formatSegmentLabel(segment) {
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const getTitleFromPath = (path) => {
  if (PATH_TITLES[path]) {
    return PATH_TITLES[path];
  }

  const pathSegments = path.split("/").filter(Boolean);
  if (pathSegments.length === 1) {
    return "Casa";
  }

  if (pathSegments[1] === "anagrafica") {
    if (pathSegments.length === 2) {
      return "Anagrafica";
    }
    if (pathSegments.length === 3) {
      return "Scheda Persona";
    }
    const journeyTitle = SEGMENT_TITLES[pathSegments[3]];
    return journeyTitle || "Scheda Persona";
  }

  const lastSegment = pathSegments[pathSegments.length - 1];
  if (SEGMENT_TITLES[lastSegment]) {
    return SEGMENT_TITLES[lastSegment];
  }

  const secondSegment = pathSegments[1];
  if (SEGMENT_TITLES[secondSegment]) {
    return SEGMENT_TITLES[secondSegment];
  }

  return formatSegmentLabel(lastSegment || pathSegments[0] || "gpc");
};

export function SiteHeader() {
  const pathname = usePathname();
  const title = getTitleFromPath(pathname);

  return (
    <header className="sticky top-0 z-40 flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur-sm transition-[width,height] ease-linear supports-[backdrop-filter]:bg-background/80">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 h-9 w-9" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="truncate text-base font-medium">{title}</h1>
      </div>
    </header>
  );
}
