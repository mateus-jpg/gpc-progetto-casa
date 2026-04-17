"use client";

import { ShieldCheck } from "lucide-react";
import DatePicker from "@/components/form/DatePicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function PrivacyComplianceSection({
  formData,
  handleChange,
  requirePaperNotice = false,
}) {
  const privacy = formData.privacy || {};
  const onChange = (field, value) => handleChange("privacy", field, value);

  return (
    <Card className="shadow-sm gap-2 h-full border-emerald-200 ring-1 ring-emerald-100">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
            7
          </span>
          <ShieldCheck className="w-5 h-5 text-emerald-700" />
          Privacy e Informativa
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 space-y-6">
        <div className="rounded-md border border-emerald-200 bg-emerald-50/80 p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="paper-notice-collected"
              checked={privacy.paperNoticeCollected === true}
              onCheckedChange={(checked) =>
                onChange("paperNoticeCollected", checked === true)
              }
            />
            <div className="space-y-1">
              <Label
                htmlFor="paper-notice-collected"
                className="font-medium cursor-pointer"
              >
                Informativa privacy cartacea raccolta e firmata
                {requirePaperNotice ? " *" : ""}
              </Label>
              <p className="text-sm text-muted-foreground">
                Spunta questa voce quando il modulo cartaceo firmato e il
                relativo documento digitale sono stati raccolti correttamente.
              </p>
            </div>
          </div>
        </div>

        {!privacy.paperNoticeCollected && (
          <p className="text-sm text-destructive">
            La registrazione resta incompleta finché non viene raccolta e
            archiviata l&apos;informativa cartacea firmata.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DatePicker
            label="Data firma informativa"
            value={privacy.paperNoticeSignedAt || undefined}
            onChange={(value) => onChange("paperNoticeSignedAt", value || null)}
            fromYear={2020}
            toYear={new Date().getFullYear()}
          />

          <div className="space-y-2">
            <Label htmlFor="paperNoticeReference">
              Riferimento documento / protocollo
            </Label>
            <Input
              id="paperNoticeReference"
              value={privacy.paperNoticeReference || ""}
              onChange={(e) => onChange("paperNoticeReference", e.target.value)}
              placeholder="Es. fascicolo cartaceo, numero modulo, protocollo"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paperNoticeNotes">Note privacy</Label>
          <Textarea
            id="paperNoticeNotes"
            value={privacy.paperNoticeNotes || ""}
            onChange={(e) => onChange("paperNoticeNotes", e.target.value)}
            placeholder="Eventuali note operative sull'informativa cartacea"
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}
