"use client";

import {
  CheckCheck,
  EllipsisVertical,
  FolderOpen,
  PencilIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import AccessDialog from "@/components/Anagrafica/AccessDialog/AccessDialog";
import DownloadPdfButton from "@/components/Anagrafica/DownloadPdfButton";
import ReminderDialog from "@/components/Anagrafica/ReminderDialog";
import { ShareAnagraficaDialog } from "@/components/Anagrafica/ShareAnagraficaDialog";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const actionButtonClassName =
  "h-auto w-full justify-start rounded-xl px-3 py-3 text-left text-sm font-medium shadow-none";

export function AnagraficaOptionsMenu({
  accesses,
  anagrafica,
  anagraficaId,
  anagraficaName,
  canManageSharing,
  isRegistrationPending,
  structureId,
  structureName,
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          className="rounded-full md:rounded-xl"
          size="sm"
          type="button"
          variant="outline"
        >
          <EllipsisVertical className="mr-0 h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Opzioni</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[min(22rem,calc(100vw-2rem))] rounded-3xl border-white/70 p-3 shadow-[0_25px_60px_-30px_rgba(15,23,42,0.45)]"
      >
        <div className="mb-3 space-y-1 px-1">
          <p className="text-sm font-semibold text-foreground">
            Opzioni scheda
          </p>
          <p className="text-xs text-muted-foreground">
            Funzioni operative e documentali legate a questa persona.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            asChild
            className={actionButtonClassName}
            onClick={() => setOpen(false)}
            variant="ghost"
          >
            <Link href={`/${structureId}/anagrafica/${anagraficaId}/edit`}>
              <PencilIcon className="h-4 w-4" />
              Modifica scheda
            </Link>
          </Button>

          <Button
            asChild
            className={actionButtonClassName}
            onClick={() => setOpen(false)}
            variant="ghost"
          >
            <Link href={`/${structureId}/anagrafica/${anagraficaId}/files`}>
              <FolderOpen className="h-4 w-4" />
              File e documenti
            </Link>
          </Button>

          {isRegistrationPending ? (
            <Button
              asChild
              className={cn(
                actionButtonClassName,
                "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
              onClick={() => setOpen(false)}
            >
              <Link
                href={`/${structureId}/anagrafica/${anagraficaId}/registrazione`}
              >
                <CheckCheck className="h-4 w-4" />
                Completa registrazione
              </Link>
            </Button>
          ) : (
            <>
              <ReminderDialog
                anagraficaId={anagraficaId}
                buttonClassName={actionButtonClassName}
                buttonLabel="Nuovo promemoria"
                buttonVariant="ghost"
                structureId={structureId}
              />
              <DownloadPdfButton
                accesses={accesses}
                anagrafica={anagrafica}
                anagraficaId={anagraficaId}
                buttonClassName={actionButtonClassName}
                buttonLabel="Scarica scheda PDF"
                buttonVariant="ghost"
                structureId={structureId}
                structureName={structureName}
              />
              <AccessDialog
                anagraficaId={anagraficaId}
                buttonClassName={actionButtonClassName}
                buttonLabel="Registra accesso"
                buttonVariant="ghost"
                structureId={structureId}
              />
              {canManageSharing ? (
                <ShareAnagraficaDialog
                  anagraficaId={anagraficaId}
                  anagraficaName={anagraficaName}
                  buttonClassName={actionButtonClassName}
                  buttonLabel="Condividi scheda"
                  buttonVariant="ghost"
                  structureId={structureId}
                />
              ) : null}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
