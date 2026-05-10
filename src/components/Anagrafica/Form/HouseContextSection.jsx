"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getStructureOperatorOptions } from "@/actions/admin/structure";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function HouseContextSection({
  formData,
  handleChange,
  structureId,
}) {
  const [operatorOptions, setOperatorOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOperators = async () => {
      if (!structureId) {
        setOperatorOptions([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const options = await getStructureOperatorOptions(structureId);
        setOperatorOptions(options || []);
      } catch (error) {
        console.error("Errore caricamento operatori struttura:", error);
        setOperatorOptions([]);
      } finally {
        setLoading(false);
      }
    };

    loadOperators();
  }, [structureId]);

  const data = formData.contestoCasa || {};
  const selectedOperatorDescription = useMemo(() => {
    const selected = operatorOptions.find(
      (option) => option.uid === data.operatoreRiferimentoUid,
    );
    return selected?.email || "";
  }, [data.operatoreRiferimentoUid, operatorOptions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contesto Casa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contestoCasa-operatore">
              Operatore di riferimento
            </Label>
            <div className="relative">
              <select
                className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                id="contestoCasa-operatore"
                value={data.operatoreRiferimentoUid || ""}
                onChange={(event) => {
                  const nextUid = event.target.value;
                  const nextOperator = operatorOptions.find(
                    (option) => option.uid === nextUid,
                  );

                  handleChange(
                    "contestoCasa",
                    "operatoreRiferimentoUid",
                    nextUid,
                  );
                  handleChange(
                    "contestoCasa",
                    "operatoreRiferimentoNome",
                    nextOperator?.displayName || "",
                  );
                }}
              >
                <option value="">Seleziona un operatore</option>
                {operatorOptions.map((option) => (
                  <option key={option.uid} value={option.uid}>
                    {option.displayName}
                  </option>
                ))}
              </select>
              {loading ? (
                <Loader2 className="absolute top-3 right-3 h-4 w-4 animate-spin text-muted-foreground" />
              ) : null}
            </div>
            {selectedOperatorDescription ? (
              <p className="text-xs text-muted-foreground">
                {selectedOperatorDescription}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                La lista arriva dagli operatori abilitati a questa casa.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contestoCasa-spazio">
              Stanza o spazio assegnato
            </Label>
            <Input
              id="contestoCasa-spazio"
              value={data.spazioAssegnato || ""}
              onChange={(event) =>
                handleChange(
                  "contestoCasa",
                  "spazioAssegnato",
                  event.target.value,
                )
              }
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contestoCasa-dataIngresso">Data ingresso</Label>
            <Input
              id="contestoCasa-dataIngresso"
              type="date"
              value={data.dataIngresso || ""}
              onChange={(event) =>
                handleChange("contestoCasa", "dataIngresso", event.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contestoCasa-dataUscita">Data uscita</Label>
            <Input
              id="contestoCasa-dataUscita"
              type="date"
              value={data.dataUscita || ""}
              onChange={(event) =>
                handleChange("contestoCasa", "dataUscita", event.target.value)
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contestoCasa-note">Note percorso casa</Label>
          <Textarea
            id="contestoCasa-note"
            rows={4}
            value={data.notePercorsoCasa || ""}
            onChange={(event) =>
              handleChange(
                "contestoCasa",
                "notePercorsoCasa",
                event.target.value,
              )
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
