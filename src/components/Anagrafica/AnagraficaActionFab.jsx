"use client";

import {
  BarChart3,
  ClipboardList,
  FileText,
  HandshakeIcon,
  Heart,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const menuButtonClassName =
  "h-auto min-h-12 w-full justify-start rounded-lg border-0 bg-muted/55 px-4 py-3 text-left text-[15px] shadow-none hover:bg-muted/85";

export function AnagraficaActionFab({
  anagraficaId,
  structureId,
  structureName,
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <button
          aria-label="Chiudi menu azioni"
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          onClick={() => setOpen(false)}
          type="button"
        />
      )}

      <div className="fixed right-4 bottom-4 z-40 flex max-w-[calc(100vw-2rem)] flex-col items-end md:hidden">
        {open && (
          <div className="animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 mb-3 flex max-h-[min(28rem,calc(100dvh-7rem))] w-[min(20rem,calc(100vw-2rem))] max-w-full flex-col gap-1.5 overflow-y-auto rounded-xl border bg-background/95 p-2.5 shadow-lg ring-1 ring-black/5 duration-200 backdrop-blur-xl">
            <div className="px-2 pt-1 pb-2">
              <p className="text-sm font-semibold text-foreground">
                Percorso persona
              </p>
              <p className="text-xs text-muted-foreground">
                Apri le schede di progetto e monitoraggio di{" "}
                {structureName || "questa casa"}.
              </p>
            </div>
            <Button
              asChild
              className={menuButtonClassName}
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              <Link href={`/${structureId}/anagrafica/${anagraficaId}/patto`}>
                <HandshakeIcon className="h-4 w-4" />
                Patto di Accoglienza
              </Link>
            </Button>

            <Button
              asChild
              className={menuButtonClassName}
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              <Link
                href={`/${structureId}/anagrafica/${anagraficaId}/progetto-personalizzato`}
              >
                <FileText className="h-4 w-4" />
                Progetto Personalizzato
              </Link>
            </Button>

            <Button
              asChild
              className={menuButtonClassName}
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              <Link
                href={`/${structureId}/anagrafica/${anagraficaId}/autovalutazione`}
              >
                <Heart className="h-4 w-4" />
                Autovalutazione
              </Link>
            </Button>

            <Button
              asChild
              className={menuButtonClassName}
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              <Link
                href={`/${structureId}/anagrafica/${anagraficaId}/monitoraggio`}
              >
                <BarChart3 className="h-4 w-4" />
                Monitoraggio Individuale
              </Link>
            </Button>

            <Button
              asChild
              className={menuButtonClassName}
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              <Link
                href={`/${structureId}/anagrafica/${anagraficaId}/interventi`}
              >
                <ClipboardList className="h-4 w-4" />
                Diario Interventi
              </Link>
            </Button>
          </div>
        )}

        <Button
          aria-expanded={open}
          aria-label={
            open ? "Chiudi azioni anagrafica" : "Apri azioni anagrafica"
          }
          className="size-14 self-end rounded-full shadow-[0_18px_40px_-16px_rgba(15,23,42,0.75)]"
          onClick={() => setOpen((current) => !current)}
          size="icon"
          type="button"
        >
          {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </Button>
      </div>
    </>
  );
}
