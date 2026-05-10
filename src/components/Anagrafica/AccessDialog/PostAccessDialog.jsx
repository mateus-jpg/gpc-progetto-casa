import { Calendar, Download } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  downloadICS,
  generateGoogleCalendarUrl,
  generateICS,
} from "@/utils/icsUtils";

export default function PostAccessDialog({
  open,
  onOpenChange,
  payload,
  onDone,
}) {
  // Extract events
  const events = useMemo(() => {
    const list = [];
    if (!payload) return list;

    const items = Array.isArray(payload) ? payload : [payload];

    items.forEach((item) => {
      // Reminders
      if (item.reminderDate) {
        list.push({
          title: `Promemoria: ${item.tipoAccesso}`,
          description: item.note || `Promemoria per ${item.tipoAccesso}`,
          start: new Date(item.reminderDate),
          allDay: false, // Timed event
        });
      }

      // Files
      if (item.files && Array.isArray(item.files)) {
        item.files.forEach((file) => {
          if (file.expirationDate) {
            list.push({
              title: `Scadenza: ${file.name}`,
              description: `Documento in scadenza per ${item.tipoAccesso}`,
              start: new Date(file.expirationDate),
              allDay: true, // Deadline usually all day
            });
          }
        });
      }
    });
    return list;
  }, [payload]);

  const hasEvents = events.length > 0;

  const handleDownload = () => {
    const ics = generateICS(events);
    downloadICS("promemoria_scadenze.ics", ics);
  };

  const handleClose = () => {
    if (onDone) onDone();
    else if (onOpenChange) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Salvataggio completato</DialogTitle>
        </DialogHeader>

        <div className="py-2 flex-1 overflow-y-auto">
          <p className="text-sm text-muted-foreground">
            L'operazione è stata completata con successo.
          </p>
          {hasEvents && (
            <div className="mt-4 space-y-3">
              <h4 className="font-medium text-sm text-foreground">
                Eventi rilevati ({events.length}):
              </h4>
              <div className="grid gap-2">
                {events.map((evt) => (
                  <div
                    key={`${evt.title}-${evt.start.toISOString()}-${evt.allDay ? "all-day" : "timed"}`}
                    className="flex items-center justify-between border rounded-md p-3 bg-muted/40"
                  >
                    <div className="min-w-0 flex-1 mr-2">
                      <div
                        className="font-medium text-sm truncate"
                        title={evt.title}
                      >
                        {evt.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {evt.allDay
                          ? evt.start.toLocaleDateString()
                          : evt.start.toLocaleString()}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto h-8 px-2 flex-shrink-0"
                      onClick={() =>
                        window.open(generateGoogleCalendarUrl(evt), "_blank")
                      }
                      title="Aggiungi a Google Calendar"
                    >
                      <Calendar className="w-4 h-4 mr-1.5" />
                      <span className="text-xs hidden min-[400px]:inline">
                        Google
                      </span>
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Puoi aggiungere i singoli eventi a Google Calendar o scaricare
                un file unico per tutti.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2 pt-2 border-t">
          {hasEvents && (
            <Button
              onClick={handleDownload}
              variant="secondary"
              className="gap-2 sm:flex-1"
            >
              <Download className="w-4 h-4" />
              Scarica Tutto (.ics)
            </Button>
          )}
          <Button
            onClick={handleClose}
            className={hasEvents ? "sm:flex-1" : "w-full"}
          >
            {hasEvents ? "Chiudi" : "OK"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
