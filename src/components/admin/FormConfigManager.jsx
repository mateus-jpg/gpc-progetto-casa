"use client";

import {
  IconChevronDown,
  IconChevronRight,
  IconDeviceFloppy,
  IconRefresh,
  IconSettings,
} from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  resetStructureFormConfigToDefaults,
  updateStructureFormConfig,
} from "@/actions/admin/structure";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  getChildFields,
  getParentFieldId,
  SECTION_DEFINITIONS,
} from "@/data/formConfigDefaults";
import { FieldOptionsEditor } from "./FieldOptionsEditor";

const VISIBILITY_OPTIONS = [
  {
    value: "required",
    label: "Obbligatorio",
    description: "Il campo deve essere compilato",
  },
  {
    value: "optional",
    label: "Opzionale",
    description: "Il campo può essere lasciato vuoto",
  },
  {
    value: "hidden",
    label: "Nascosto",
    description: "Il campo non viene mostrato",
  },
];

export function FormConfigManager({ structureId, initialConfig }) {
  const [config, setConfig] = useState(
    initialConfig || { version: 1, sections: {} },
  );
  const [loading, setLoading] = useState(false);
  const [openSections, setOpenSections] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Toggle section expand/collapse
  const toggleSectionOpen = (sectionId) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // Toggle section enabled/disabled
  const toggleSectionEnabled = useCallback((sectionId, enabled) => {
    setConfig((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionId]: {
          ...prev.sections[sectionId],
          enabled,
        },
      },
    }));
    setHasChanges(true);
  }, []);

  // Update section label
  const updateSectionLabel = useCallback((sectionId, label) => {
    setConfig((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionId]: {
          ...prev.sections[sectionId],
          label: label || null, // null means use default
        },
      },
    }));
    setHasChanges(true);
  }, []);

  // Update field visibility
  const updateFieldVisibility = useCallback(
    (sectionId, fieldId, visibility) => {
      setConfig((prev) => ({
        ...prev,
        sections: {
          ...prev.sections,
          [sectionId]: {
            ...prev.sections[sectionId],
            fields: {
              ...prev.sections[sectionId]?.fields,
              [fieldId]: {
                ...prev.sections[sectionId]?.fields?.[fieldId],
                visibility,
              },
            },
          },
        },
      }));
      setHasChanges(true);
    },
    [],
  );

  // Update field label
  const updateFieldLabel = useCallback((sectionId, fieldId, label) => {
    setConfig((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionId]: {
          ...prev.sections[sectionId],
          fields: {
            ...prev.sections[sectionId]?.fields,
            [fieldId]: {
              ...prev.sections[sectionId]?.fields?.[fieldId],
              label: label || null, // null means use default
            },
          },
        },
      },
    }));
    setHasChanges(true);
  }, []);

  // Update field options
  const updateFieldOptions = useCallback((sectionId, fieldId, options) => {
    setConfig((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionId]: {
          ...prev.sections[sectionId],
          fields: {
            ...prev.sections[sectionId]?.fields,
            [fieldId]: {
              ...prev.sections[sectionId]?.fields?.[fieldId],
              options: options, // null means use all defaults
            },
          },
        },
      },
    }));
    setHasChanges(true);
  }, []);

  // Save changes
  const handleSave = async () => {
    setLoading(true);
    try {
      const result = await updateStructureFormConfig(structureId, config);
      if (result.success) {
        toast.success("Configurazione salvata con successo");
        setHasChanges(false);
      } else {
        toast.error("Errore: " + result.error);
      }
    } catch (error) {
      console.error(error);
      toast.error("Errore durante il salvataggio");
    } finally {
      setLoading(false);
    }
  };

  // Reset to defaults
  const handleResetToDefaults = async () => {
    setLoading(true);
    try {
      const result = await resetStructureFormConfigToDefaults(structureId);
      if (result.success) {
        toast.success("Configurazione ripristinata");
        window.location.reload();
      } else {
        toast.error("Errore: " + result.error);
      }
    } catch (error) {
      console.error(error);
      toast.error("Errore durante il ripristino");
    } finally {
      setLoading(false);
    }
  };

  // Get ordered sections
  const orderedSections = Object.entries(SECTION_DEFINITIONS).sort((a, b) => {
    const orderA = config.sections?.[a[0]]?.order ?? a[1].defaultOrder;
    const orderB = config.sections?.[b[0]]?.order ?? b[1].defaultOrder;
    return orderA - orderB;
  });

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={loading}>
              <IconRefresh className="mr-2 h-4 w-4" />
              Ripristina Predefinite
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Ripristinare la configurazione predefinita?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione sovrascriverà tutte le personalizzazioni con la
                configurazione predefinita. Questa operazione non può essere
                annullata.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetToDefaults}>
                Ripristina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button onClick={handleSave} disabled={loading || !hasChanges}>
          <IconDeviceFloppy className="mr-2 h-4 w-4" />
          {loading ? "Salvataggio..." : "Salva Modifiche"}
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            Personalizza quali sezioni e campi mostrare nel modulo di creazione
            anagrafica. I campi contrassegnati come "Obbligatorio" dovranno
            essere compilati, quelli "Opzionali" potranno essere lasciati vuoti,
            e quelli "Nascosti" non verranno mostrati.
          </p>
        </CardContent>
      </Card>

      {/* Sections List */}
      <div className="space-y-4">
        {orderedSections.map(([sectionId, sectionDef]) => (
          <SectionCard
            key={sectionId}
            sectionId={sectionId}
            sectionDef={sectionDef}
            sectionConfig={config.sections?.[sectionId]}
            isOpen={openSections[sectionId] || false}
            onToggleOpen={() => toggleSectionOpen(sectionId)}
            onToggleEnabled={(enabled) =>
              toggleSectionEnabled(sectionId, enabled)
            }
            onUpdateLabel={(label) => updateSectionLabel(sectionId, label)}
            onUpdateFieldVisibility={(fieldId, visibility) =>
              updateFieldVisibility(sectionId, fieldId, visibility)
            }
            onUpdateFieldLabel={(fieldId, label) =>
              updateFieldLabel(sectionId, fieldId, label)
            }
            onUpdateFieldOptions={(fieldId, options) =>
              updateFieldOptions(sectionId, fieldId, options)
            }
          />
        ))}
      </div>
    </div>
  );
}

function SectionCard({
  sectionId,
  sectionDef,
  sectionConfig,
  isOpen,
  onToggleOpen,
  onToggleEnabled,
  onUpdateLabel,
  onUpdateFieldVisibility,
  onUpdateFieldLabel,
  onUpdateFieldOptions,
}) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelValue, setLabelValue] = useState(sectionConfig?.label || "");

  const isEnabled = sectionConfig?.enabled ?? true;
  const displayLabel = sectionConfig?.label || sectionDef.defaultLabel;

  // Skip service section (uses accessCategories instead)
  if (sectionDef.isServiceSection) {
    return (
      <Card className="opacity-60">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full bg-${sectionDef.color}-500`}
              />
              <CardTitle className="text-lg">
                {sectionDef.defaultLabel}
              </CardTitle>
            </div>
            <span className="text-sm text-muted-foreground">
              Configurata separatamente (Categorie Accessi)
            </span>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const handleLabelBlur = () => {
    setEditingLabel(false);
    if (labelValue !== (sectionConfig?.label || "")) {
      onUpdateLabel(labelValue.trim() || null);
    }
  };

  const fieldCount = Object.keys(sectionDef.fields).length;
  const visibleFieldCount = Object.entries(sectionDef.fields).filter(
    ([fieldId]) => {
      const visibility = sectionConfig?.fields?.[fieldId]?.visibility;
      return visibility !== "hidden";
    },
  ).length;

  return (
    <Card className={!isEnabled ? "opacity-60" : ""}>
      <Collapsible open={isOpen} onOpenChange={onToggleOpen}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer flex-1">
                {isOpen ? (
                  <IconChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <IconChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                <div
                  className={`w-3 h-3 rounded-full bg-${sectionDef.color}-500`}
                />
                {editingLabel ? (
                  <Input
                    value={labelValue}
                    onChange={(e) => setLabelValue(e.target.value)}
                    onBlur={handleLabelBlur}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleLabelBlur();
                      if (e.key === "Escape") {
                        setLabelValue(sectionConfig?.label || "");
                        setEditingLabel(false);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder={sectionDef.defaultLabel}
                    autoFocus
                    className="h-8 w-64"
                  />
                ) : (
                  <CardTitle
                    className="text-lg cursor-text"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLabelValue(sectionConfig?.label || "");
                      setEditingLabel(true);
                    }}
                  >
                    {displayLabel}
                  </CardTitle>
                )}
                <span className="text-sm text-muted-foreground">
                  ({visibleFieldCount}/{fieldCount} campi visibili)
                </span>
              </div>
            </CollapsibleTrigger>
            <div className="flex items-center gap-2">
              <Label
                htmlFor={`section-${sectionId}-enabled`}
                className="text-sm text-muted-foreground"
              >
                {isEnabled ? "Attiva" : "Disattiva"}
              </Label>
              <Switch
                id={`section-${sectionId}-enabled`}
                checked={isEnabled}
                onCheckedChange={onToggleEnabled}
              />
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-2">
            <div className="space-y-4">
              {Object.entries(sectionDef.fields).map(([fieldId, fieldDef]) => (
                <FieldConfigRow
                  key={fieldId}
                  sectionId={sectionId}
                  fieldId={fieldId}
                  fieldDef={fieldDef}
                  fieldConfig={sectionConfig?.fields?.[fieldId]}
                  sectionConfig={sectionConfig}
                  onUpdateVisibility={(visibility) =>
                    onUpdateFieldVisibility(fieldId, visibility)
                  }
                  onUpdateLabel={(label) => onUpdateFieldLabel(fieldId, label)}
                  onUpdateOptions={(options) =>
                    onUpdateFieldOptions(fieldId, options)
                  }
                  disabled={!isEnabled}
                />
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function FieldConfigRow({
  sectionId,
  fieldId,
  fieldDef,
  fieldConfig,
  sectionConfig,
  onUpdateVisibility,
  onUpdateLabel,
  onUpdateOptions,
  disabled,
}) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelValue, setLabelValue] = useState(fieldConfig?.label || "");
  const [showOptionsEditor, setShowOptionsEditor] = useState(false);

  const currentVisibility =
    fieldConfig?.visibility || fieldDef.defaultVisibility;
  const displayLabel = fieldConfig?.label || fieldDef.defaultLabel;
  const hasCustomOptions = Array.isArray(fieldConfig?.options);
  const hasDefaultOptions =
    Array.isArray(fieldDef.defaultOptions) &&
    fieldDef.defaultOptions.length > 0;

  // Check if this is a conditional field (parent-linked)
  const isConditional = fieldDef.defaultVisibility === "conditional";
  const parentFieldId = getParentFieldId(sectionId, fieldId);

  // Check if parent field is hidden (which means this conditional field is also hidden)
  const parentIsHidden =
    parentFieldId &&
    sectionConfig?.fields?.[parentFieldId]?.visibility === "hidden";

  // Get parent field label for display
  const parentFieldDef = parentFieldId
    ? SECTION_DEFINITIONS[sectionId]?.fields?.[parentFieldId]
    : null;
  const parentLabel = parentFieldDef?.defaultLabel || parentFieldId;

  const handleLabelBlur = () => {
    setEditingLabel(false);
    if (labelValue !== (fieldConfig?.label || "")) {
      onUpdateLabel(labelValue.trim() || null);
    }
  };

  return (
    <div
      className={`flex flex-col gap-2 p-3 rounded-lg border ${disabled || parentIsHidden ? "opacity-50" : ""} ${parentIsHidden ? "bg-muted/30" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          {editingLabel && !parentIsHidden ? (
            <Input
              value={labelValue}
              onChange={(e) => setLabelValue(e.target.value)}
              onBlur={handleLabelBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLabelBlur();
                if (e.key === "Escape") {
                  setLabelValue(fieldConfig?.label || "");
                  setEditingLabel(false);
                }
              }}
              placeholder={fieldDef.defaultLabel}
              autoFocus
              className="h-8 w-48"
            />
          ) : (
            <span
              className={`font-medium ${!parentIsHidden ? "cursor-text hover:text-primary" : ""}`}
              onClick={() => {
                if (!parentIsHidden) {
                  setLabelValue(fieldConfig?.label || "");
                  setEditingLabel(true);
                }
              }}
            >
              {displayLabel}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            ({fieldDef.type})
          </span>
          {isConditional && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded flex items-center gap-1">
              Dipende da "{parentLabel}"
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {parentIsHidden ? (
            <span className="text-xs text-muted-foreground italic">
              Nascosto (campo padre nascosto)
            </span>
          ) : (
            <>
              {hasDefaultOptions && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOptionsEditor(!showOptionsEditor)}
                  className={hasCustomOptions ? "text-primary" : ""}
                  disabled={disabled}
                >
                  <IconSettings className="h-4 w-4 mr-1" />
                  Opzioni
                  {hasCustomOptions && (
                    <span className="ml-1 text-xs">(personalizzate)</span>
                  )}
                </Button>
              )}

              {!isConditional && (
                <Select
                  value={currentVisibility}
                  onValueChange={onUpdateVisibility}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIBILITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {isConditional && !parentIsHidden && (
                <span className="text-xs text-muted-foreground">
                  Visibile quando condizione soddisfatta
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Options Editor */}
      {showOptionsEditor && hasDefaultOptions && !parentIsHidden && (
        <div className="mt-2 pt-2 border-t">
          <FieldOptionsEditor
            defaultOptions={fieldDef.defaultOptions}
            currentOptions={fieldConfig?.options}
            onChange={onUpdateOptions}
          />
        </div>
      )}
    </div>
  );
}

export default FormConfigManager;
