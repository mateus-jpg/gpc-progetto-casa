"use client";

import {
  IconChevronDown,
  IconChevronRight,
  IconDeviceFloppy,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  resetStructureCategoriesToDefaults,
  updateStructureCategories,
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

export function CategoriesManager({ structureId, initialCategories }) {
  const [categories, setCategories] = useState(initialCategories || []);
  const [saving, setSaving] = useState(false);
  const [openCategories, setOpenCategories] = useState({});
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Toggle category expand/collapse
  const toggleCategory = (categoryValue) => {
    setOpenCategories((prev) => ({
      ...prev,
      [categoryValue]: !prev[categoryValue],
    }));
  };

  // Generate a value from a label
  const labelToValue = useCallback((label) => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 30);
  }, []);

  // Add a new category
  const handleAddCategory = useCallback(() => {
    if (!newCategoryLabel.trim()) return;

    const newValue = labelToValue(newCategoryLabel);

    // Check if value already exists
    if (categories.some((cat) => cat.value === newValue)) {
      toast.error("Una categoria con questo nome esiste già");
      return;
    }

    const newCategory = {
      value: newValue,
      label: newCategoryLabel.trim(),
      subCategories: ["Altro"],
    };

    setCategories((prev) => [...prev, newCategory]);
    setNewCategoryLabel("");
    setHasChanges(true);
    setOpenCategories((prev) => ({ ...prev, [newValue]: true }));
  }, [newCategoryLabel, categories, labelToValue]);

  // Remove a category
  const handleRemoveCategory = useCallback((categoryValue) => {
    setCategories((prev) => prev.filter((cat) => cat.value !== categoryValue));
    setHasChanges(true);
  }, []);

  // Update category label
  const handleUpdateCategoryLabel = useCallback((categoryValue, newLabel) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.value === categoryValue) {
          return { ...cat, label: newLabel };
        }
        return cat;
      }),
    );
    setHasChanges(true);
  }, []);

  // Add a subcategory
  const handleAddSubcategory = useCallback((categoryValue, newSubcategory) => {
    if (!newSubcategory.trim()) return;

    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.value === categoryValue) {
          const existingSubcats = cat.subCategories || [];

          // Check if already exists
          if (
            existingSubcats.some(
              (s) => s.toLowerCase() === newSubcategory.toLowerCase(),
            )
          ) {
            toast.error("Questa sottocategoria esiste già");
            return cat;
          }

          // Add before "Altro" if it exists
          const altroIndex = existingSubcats.indexOf("Altro");
          const newSubcats = [...existingSubcats];
          if (altroIndex !== -1) {
            newSubcats.splice(altroIndex, 0, newSubcategory.trim());
          } else {
            newSubcats.push(newSubcategory.trim());
          }

          return { ...cat, subCategories: newSubcats };
        }
        return cat;
      }),
    );
    setHasChanges(true);
  }, []);

  // Remove a subcategory
  const handleRemoveSubcategory = useCallback((categoryValue, subcategory) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.value === categoryValue) {
          return {
            ...cat,
            subCategories: cat.subCategories.filter((s) => s !== subcategory),
          };
        }
        return cat;
      }),
    );
    setHasChanges(true);
  }, []);

  // Update a subcategory
  const handleUpdateSubcategory = useCallback(
    (categoryValue, oldSubcategory, newSubcategory) => {
      setCategories((prev) =>
        prev.map((cat) => {
          if (cat.value === categoryValue) {
            return {
              ...cat,
              subCategories: cat.subCategories.map((s) =>
                s === oldSubcategory ? newSubcategory : s,
              ),
            };
          }
          return cat;
        }),
      );
      setHasChanges(true);
    },
    [],
  );

  // Save changes
  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateStructureCategories(structureId, categories);
      if (result.success) {
        toast.success("Categorie salvate con successo");
        setHasChanges(false);
      } else {
        toast.error(`Errore: ${result.error}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleResetToDefaults = async () => {
    setSaving(true);
    try {
      const result = await resetStructureCategoriesToDefaults(structureId);
      if (result.success) {
        // Reload page to get fresh defaults
        window.location.reload();
      } else {
        toast.error(`Errore: ${result.error}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Errore durante il ripristino");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={saving}>
              <IconRefresh className="mr-2 h-4 w-4" />
              Ripristina Predefinite
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Ripristinare le categorie predefinite?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione sovrascriverà tutte le categorie personalizzate
                con quelle predefinite. Questa operazione non può essere
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

        <Button onClick={handleSave} disabled={saving || !hasChanges}>
          <IconDeviceFloppy className="mr-2 h-4 w-4" />
          {saving ? "Salvataggio..." : "Salva Modifiche"}
        </Button>
      </div>

      {/* Add New Category */}
      <Card>
        <CardHeader>
          <CardTitle>Aggiungi Nuova Categoria</CardTitle>
          <CardDescription>
            Crea una nuova categoria per gli accessi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Nome categoria..."
              value={newCategoryLabel}
              onChange={(e) => setNewCategoryLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCategory();
                }
              }}
            />
            <Button
              onClick={handleAddCategory}
              disabled={!newCategoryLabel.trim()}
            >
              <IconPlus className="mr-2 h-4 w-4" />
              Aggiungi
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Categories List */}
      <div className="space-y-4">
        {categories.map((category) => (
          <CategoryCard
            key={category.value}
            category={category}
            isOpen={openCategories[category.value] || false}
            onToggle={() => toggleCategory(category.value)}
            onUpdateLabel={(newLabel) =>
              handleUpdateCategoryLabel(category.value, newLabel)
            }
            onRemove={() => handleRemoveCategory(category.value)}
            onAddSubcategory={(sub) =>
              handleAddSubcategory(category.value, sub)
            }
            onRemoveSubcategory={(sub) =>
              handleRemoveSubcategory(category.value, sub)
            }
            onUpdateSubcategory={(oldSub, newSub) =>
              handleUpdateSubcategory(category.value, oldSub, newSub)
            }
          />
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Nessuna categoria configurata. Aggiungi una nuova categoria o
          ripristina le predefinite.
        </div>
      )}
    </div>
  );
}

function CategoryCard({
  category,
  isOpen,
  onToggle,
  onUpdateLabel,
  onRemove,
  onAddSubcategory,
  onRemoveSubcategory,
  onUpdateSubcategory,
}) {
  const [newSubcategory, setNewSubcategory] = useState("");
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelValue, setLabelValue] = useState(category.label);

  const handleAddSubcategory = () => {
    if (newSubcategory.trim()) {
      onAddSubcategory(newSubcategory.trim());
      setNewSubcategory("");
    }
  };

  const handleLabelBlur = () => {
    setEditingLabel(false);
    if (labelValue.trim() && labelValue !== category.label) {
      onUpdateLabel(labelValue.trim());
    } else {
      setLabelValue(category.label);
    }
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer flex-1">
                {isOpen ? (
                  <IconChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <IconChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                {editingLabel ? (
                  <Input
                    value={labelValue}
                    onChange={(e) => setLabelValue(e.target.value)}
                    onBlur={handleLabelBlur}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleLabelBlur();
                      if (e.key === "Escape") {
                        setLabelValue(category.label);
                        setEditingLabel(false);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="h-8 w-48"
                  />
                ) : (
                  <CardTitle
                    className="text-lg cursor-text"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingLabel(true);
                    }}
                  >
                    {category.label}
                  </CardTitle>
                )}
                <span className="text-sm text-muted-foreground">
                  ({category.subCategories?.length || 0} sottocategorie)
                </span>
              </div>
            </CollapsibleTrigger>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                >
                  <IconTrash className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Eliminare "{category.label}"?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Questa azione eliminerà la categoria e tutte le sue
                    sottocategorie. Gli accessi esistenti non saranno
                    modificati.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onRemove}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Elimina
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-2">
            {/* Add subcategory */}
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Nuova sottocategoria..."
                value={newSubcategory}
                onChange={(e) => setNewSubcategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubcategory();
                  }
                }}
              />
              <Button
                variant="secondary"
                onClick={handleAddSubcategory}
                disabled={!newSubcategory.trim()}
              >
                <IconPlus className="h-4 w-4" />
              </Button>
            </div>

            {/* Subcategories list */}
            <div className="space-y-2">
              {category.subCategories?.map((sub) => (
                <SubcategoryItem
                  key={sub}
                  subcategory={sub}
                  onUpdate={(newValue) => onUpdateSubcategory(sub, newValue)}
                  onRemove={() => onRemoveSubcategory(sub)}
                  isAltro={sub === "Altro"}
                />
              ))}
            </div>

            {(!category.subCategories ||
              category.subCategories.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-2">
                Nessuna sottocategoria. Aggiungi la prima sottocategoria sopra.
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function SubcategoryItem({ subcategory, onUpdate, onRemove, isAltro }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(subcategory);

  const handleBlur = () => {
    setEditing(false);
    if (value.trim() && value !== subcategory) {
      onUpdate(value.trim());
    } else {
      setValue(subcategory);
    }
  };

  return (
    <div className="flex items-center gap-2 group">
      {editing ? (
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleBlur();
            if (e.key === "Escape") {
              setValue(subcategory);
              setEditing(false);
            }
          }}
          autoFocus
          className="h-8 flex-1"
        />
      ) : (
        <button
          type="button"
          className={`flex-1 px-3 py-1.5 text-sm rounded border border-transparent hover:border-border cursor-text text-left bg-transparent ${isAltro ? "font-medium text-primary" : ""}`}
          onClick={() => !isAltro && setEditing(true)}
          disabled={isAltro}
        >
          {subcategory}
          {isAltro && (
            <span className="ml-2 text-xs text-muted-foreground">
              (sempre disponibile)
            </span>
          )}
        </button>
      )}
      {!isAltro && (
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
          onClick={onRemove}
        >
          <IconTrash className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
