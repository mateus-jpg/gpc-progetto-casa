"use client";

import clsx from "clsx";
import { useCallback, useState } from "react";
import {
  AccessClassifications,
  AccessTypes as DefaultAccessTypes,
} from "@/components/Anagrafica/AccessDialog/AccessTypes";
import { Combobox, MultiCombobox } from "@/components/form/Combobox";
import DatePicker from "@/components/form/DatePicker";
import { TiptapEditor } from "@/components/tiptap-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropzone } from "@/components/ui/shadcn-io/dropzone";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AccessServicesForm({
  state, // The entire access state object (keyed by type.value)
  onChange, // (type, field, value) => void
  showClassification = false,
  showReferralEntity = false,
  categories = null, // Custom categories from structure (optional, defaults to AccessTypes)
  onNewSubcategory = null, // Callback when user adds new subcategory via Altro: (categoryValue, newSubcategory) => void
  existingFilesRenderer = null, // (typeValue) => ReactNode — renders existing files above the Dropzone
}) {
  // Use provided categories or fall back to defaults
  const accessTypes =
    categories && categories.length > 0 ? categories : DefaultAccessTypes;

  // Track pending "altro" values that haven't been saved yet
  const [_pendingAltro, setPendingAltro] = useState({});

  // Handle adding a new subcategory from the "Altro" text input
  const handleSaveAltroAsSubcategory = useCallback(
    (typeValue) => {
      const altroText = state[typeValue]?.altroText?.trim();
      if (!altroText) return;

      // Call the callback to persist the new subcategory
      if (onNewSubcategory) {
        onNewSubcategory(typeValue, altroText);
      }

      // Add the new value to selected subcategories
      const currentSubcats = state[typeValue]?.subCategories || [];
      if (!currentSubcats.includes(altroText)) {
        // Remove "Altro" from selection and add the actual value
        const newSubcats = currentSubcats.filter((s) => s !== "Altro");
        newSubcats.push(altroText);
        onChange(typeValue, "subCategories", newSubcats);
      }

      // Clear the altro text
      onChange(typeValue, "altroText", "");
      setPendingAltro((prev) => ({ ...prev, [typeValue]: false }));
    },
    [state, onChange, onNewSubcategory],
  );

  const isTypeValid = (typeValue) => {
    const typeState = state[typeValue];
    if (!typeState) return false;
    // Basic validation: must have subcategories selected.
    // If 'Altro' is selected, text must be present.
    if (typeState.subCategories.length > 0) {
      if (
        typeState.subCategories.includes("Altro") &&
        !typeState.altroText.trim()
      )
        return false;
      return true;
    }
    return false;
  };

  return (
    <Tabs
      defaultValue={accessTypes[0]?.value}
      className="flex-1 flex flex-col overflow-hidden"
    >
      <div className="mb-4 overflow-x-auto rounded-md bg-muted border-b px-1">
        <TabsList className="flex w-max space-x-2 overflow-x-auto">
          {accessTypes.map((type) => {
            const isValid = isTypeValid(type.value);
            return (
              <TabsTrigger
                key={type.value}
                value={type.value}
                className={clsx(
                  "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative",
                  isValid && "bg-lime-600/20 font-bold",
                )}
              >
                {type.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      {accessTypes.map((type) => {
        const typeState = state[type.value];
        // Safely fallback if state isn't initialized yet (though it should be)
        if (!typeState) return null;

        return (
          <TabsContent
            key={type.value}
            value={type.value}
            className="space-y-4 mt-0 flex-1 overflow-y-auto p-1"
          >
            <div
              className={clsx(
                "grid gap-4 align-top grid-cols-1 md:grid-cols-2",
              )}
            >
              {/* Subcategories */}
              <div className="flex flex-col gap-2 min-w-0">
                <MultiCombobox
                  label="Sottocategorie"
                  values={typeState.subCategories}
                  onChange={(values) => {
                    onChange(type.value, "subCategories", values);
                    if (!values.includes("Altro")) {
                      onChange(type.value, "altroText", "");
                      setPendingAltro((prev) => ({
                        ...prev,
                        [type.value]: false,
                      }));
                    } else {
                      setPendingAltro((prev) => ({
                        ...prev,
                        [type.value]: true,
                      }));
                    }
                  }}
                  options={[
                    ...(type.subCategories || []),
                    ...(type.subCategories?.includes("Altro") ? [] : ["Altro"]),
                  ]}
                  placeholder="Seleziona sottocategorie..."
                />
              </div>

              {/* Altro Input - shows when "Altro" is selected */}
              {typeState.subCategories.includes("Altro") && (
                <div className="flex flex-col gap-2 align-top">
                  <Label>
                    Specifica "Altro" (verrà salvato come nuova sottocategoria)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={typeState.altroText}
                      onChange={(e) =>
                        onChange(type.value, "altroText", e.target.value)
                      }
                      placeholder="Nuova sottocategoria..."
                      className="flex-1"
                    />
                    {onNewSubcategory && typeState.altroText?.trim() && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSaveAltroAsSubcategory(type.value)}
                      >
                        Aggiungi
                      </Button>
                    )}
                  </div>
                  {onNewSubcategory && (
                    <p className="text-xs text-muted-foreground">
                      Clicca "Aggiungi" per salvare come nuova sottocategoria
                      disponibile per tutti
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Note Editor */}
            <div className="space-y-2">
              <Label>Note aggiuntive</Label>
              <TiptapEditor
                content={typeState.content}
                onChange={(html) => onChange(type.value, "content", html)}
                placeholder={`Note per ${type.label}...`}
              />
            </div>

            {/* Files */}
            <div className="space-y-2">
              <Label>Allegati</Label>
              {existingFilesRenderer?.(type.value)}
              <Dropzone
                onDrop={(acceptedFiles) => {
                  const newFiles = acceptedFiles.map((file) => ({
                    file,
                    fileName: file.name,
                    name: file.name,
                    creationDate: new Date(),
                    expirationDate: null,
                  }));
                  onChange(type.value, "files", [
                    ...typeState.files,
                    ...newFiles,
                  ]);
                }}
                className="border border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50"
              >
                <p className="text-muted-foreground">
                  Clicca o trascina file qui per caricarli
                </p>
              </Dropzone>

              {typeState.files.length > 0 && (
                <div className="mt-4 space-y-3">
                  {typeState.files.map((fileObj, idx) => (
                    <div
                      key={`${fileObj.file.name}-${fileObj.file.lastModified || fileObj.file.size}`}
                      className="border rounded-md p-3 bg-muted/30 grid gap-3"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium truncate max-w-[80%]">
                          {fileObj.file.name}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-destructive hover:text-destructive/90"
                          onClick={() => {
                            const newFiles = typeState.files.filter(
                              (_, i) => i !== idx,
                            );
                            onChange(type.value, "files", newFiles);
                          }}
                        >
                          ×
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label
                            htmlFor={`file-name-${type.value}-${idx}`}
                            className="text-xs"
                          >
                            Nome Documento
                          </Label>
                          <Input
                            id={`file-name-${type.value}-${idx}`}
                            value={fileObj.name}
                            onChange={(e) => {
                              const newFiles = [...typeState.files];
                              newFiles[idx] = {
                                ...newFiles[idx],
                                name: e.target.value,
                              };
                              onChange(type.value, "files", newFiles);
                            }}
                            className="h-9"
                            placeholder="Nome del documento"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <DatePicker
                            label="Data Doc."
                            value={fileObj.creationDate}
                            onChange={(date) => {
                              const newFiles = [...typeState.files];
                              newFiles[idx] = {
                                ...newFiles[idx],
                                creationDate: date,
                              };
                              onChange(type.value, "files", newFiles);
                            }}
                            fromYear={2000}
                          />
                          <DatePicker
                            label="Scadenza (Opz.)"
                            value={fileObj.expirationDate}
                            onChange={(date) => {
                              const newFiles = [...typeState.files];
                              newFiles[idx] = {
                                ...newFiles[idx],
                                expirationDate: date,
                              };
                              onChange(type.value, "files", newFiles);
                            }}
                            fromYear={new Date().getFullYear()}
                            toYear={new Date().getFullYear() + 10}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Extra Fields: Classification & Entity */}
            {(showClassification || showReferralEntity) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {showClassification && (
                  <Combobox
                    label="Classificazione Intervento"
                    value={typeState.classification}
                    onChange={(value) =>
                      onChange(type.value, "classification", value || "")
                    }
                    options={AccessClassifications}
                    placeholder="Seleziona la classificazione..."
                  />
                )}
                {showReferralEntity && (
                  <div className="flex flex-col gap-2">
                    <Label>Ente di riferimento (per Referral)</Label>
                    <Input
                      value={typeState.referralEntity}
                      onChange={(e) =>
                        onChange(
                          type.value,
                          "referralEntity",
                          e.target.value || "",
                        )
                      }
                      placeholder="Seleziona l'ente di riferimento..."
                    />
                  </div>
                )}
              </div>
            )}

            {/* Reminder Section */}
            <div className="grid gap-2 border-t pt-4 mt-2">
              <Label className="text-base font-semibold">
                Promemoria (Opzionale)
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DatePicker
                  label="Data Promemoria"
                  value={typeState.reminderDate}
                  onChange={(date) =>
                    onChange(type.value, "reminderDate", date)
                  }
                  fromYear={new Date().getFullYear()}
                  toYear={new Date().getFullYear() + 5}
                />
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor={`time-${type.value}`}
                    className="text-sm font-medium"
                  >
                    Ora
                  </Label>
                  <Input
                    id={`time-${type.value}`}
                    type="time"
                    value={typeState.reminderTime}
                    onChange={(e) =>
                      onChange(type.value, "reminderTime", e.target.value)
                    }
                    disabled={!typeState.reminderDate}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
