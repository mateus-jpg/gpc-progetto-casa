"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CARE_TEAM_ROLE_OPTIONS } from "@/data/careTeamRoles";

function createEmptyCareTeamFigure() {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `figure-${Date.now()}`,
    ruolo: "",
    nome: "",
    cognome: "",
  };
}

export default function HouseContextSection({ formData, handleChange }) {
  const data = formData.contestoCasa || {};
  const figures = Array.isArray(data.figureOperative)
    ? data.figureOperative
    : [];

  const updateFigure = (index, field, value) => {
    const nextFigures = figures.map((figure, currentIndex) =>
      currentIndex === index ? { ...figure, [field]: value } : figure,
    );
    handleChange("contestoCasa", "figureOperative", nextFigures);
  };

  const addFigure = () => {
    handleChange("contestoCasa", "figureOperative", [
      ...figures,
      createEmptyCareTeamFigure(),
    ]);
  };

  const removeFigure = (index) => {
    handleChange(
      "contestoCasa",
      "figureOperative",
      figures.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contesto Casa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contestoCasa-operatore">
              Riferimento principale
            </Label>
            <Input
              id="contestoCasa-operatore"
              placeholder="Nome e cognome, equipe o ente"
              value={data.operatoreRiferimentoNome || ""}
              onChange={(event) => {
                handleChange(
                  "contestoCasa",
                  "operatoreRiferimentoNome",
                  event.target.value,
                );
                handleChange("contestoCasa", "operatoreRiferimentoUid", "");
              }}
            />
            <p className="text-xs text-muted-foreground">
              Campo libero: non deve corrispondere a un account operatore.
            </p>
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

        <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">
                Figure che operano sulla persona
              </h3>
              <p className="text-xs text-muted-foreground">
                Registra ruolo, nome e cognome anche quando la figura non ha un
                account in piattaforma.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={addFigure}>
              <Plus className="h-4 w-4" />
              Aggiungi figura
            </Button>
          </div>

          {figures.length === 0 ? (
            <p className="rounded-md border border-dashed bg-background px-3 py-4 text-sm text-muted-foreground">
              Nessuna figura registrata.
            </p>
          ) : (
            <div className="space-y-3">
              {figures.map((figure, index) => (
                <div
                  className="grid gap-3 rounded-md border bg-background p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                  key={figure.id || `${figure.ruolo}-${index}`}
                >
                  <div className="space-y-2">
                    <Label htmlFor={`contestoCasa-figura-ruolo-${index}`}>
                      Ruolo
                    </Label>
                    <select
                      className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                      id={`contestoCasa-figura-ruolo-${index}`}
                      value={figure.ruolo || ""}
                      onChange={(event) =>
                        updateFigure(index, "ruolo", event.target.value)
                      }
                    >
                      <option value="">Seleziona ruolo</option>
                      {CARE_TEAM_ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.value} - {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`contestoCasa-figura-nome-${index}`}>
                      Nome
                    </Label>
                    <Input
                      id={`contestoCasa-figura-nome-${index}`}
                      value={figure.nome || ""}
                      onChange={(event) =>
                        updateFigure(index, "nome", event.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`contestoCasa-figura-cognome-${index}`}>
                      Cognome
                    </Label>
                    <Input
                      id={`contestoCasa-figura-cognome-${index}`}
                      value={figure.cognome || ""}
                      onChange={(event) =>
                        updateFigure(index, "cognome", event.target.value)
                      }
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      aria-label="Rimuovi figura"
                      className="w-full md:w-10"
                      type="button"
                      variant="ghost"
                      onClick={() => removeFigure(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
