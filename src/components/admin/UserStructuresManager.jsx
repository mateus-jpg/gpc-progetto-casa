"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  addUserToStructure,
  listAllStructures,
  removeUserFromStructure,
} from "@/actions/admin/users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function UserStructuresManager({ user, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [structures, setStructures] = useState([]);
  const [loadingStructures, setLoadingStructures] = useState(true);
  const [selectedStructure, setSelectedStructure] = useState("");
  const [actionInProgress, setActionInProgress] = useState(null);

  useEffect(() => {
    async function fetchStructures() {
      try {
        const result = await listAllStructures();
        if (result.success) {
          setStructures(result.structures);
        } else {
          toast.error("Failed to load structures");
        }
      } catch (error) {
        toast.error("Failed to load structures");
      } finally {
        setLoadingStructures(false);
      }
    }
    fetchStructures();
  }, []);

  const userStructureIds = user?.structureIds || [];

  // Structures user doesn't have access to yet
  const availableStructures = structures.filter(
    (s) => !userStructureIds.includes(s.id),
  );

  const handleAddStructure = async () => {
    if (!selectedStructure) {
      toast.error("Please select a structure");
      return;
    }

    setActionInProgress(selectedStructure);
    try {
      const result = await addUserToStructure(user.uid, selectedStructure);

      if (result.success) {
        toast.success("Structure added successfully");
        setSelectedStructure("");
        if (onUpdate) onUpdate();
      } else {
        toast.error(result.error || "Failed to add structure");
      }
    } catch (error) {
      toast.error("Failed to add structure");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRemoveStructure = async (structureId) => {
    setActionInProgress(structureId);
    try {
      const result = await removeUserFromStructure(user.uid, structureId);

      if (result.success) {
        toast.success("Structure removed successfully");
        if (onUpdate) onUpdate();
      } else {
        toast.error(result.error || "Failed to remove structure");
      }
    } catch (error) {
      toast.error("Failed to remove structure");
    } finally {
      setActionInProgress(null);
    }
  };

  const getStructureName = (id) => {
    const structure = structures.find((s) => s.id === id);
    return structure?.name || id;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Structure Access</CardTitle>
        <CardDescription>
          Manage which structures this user can access.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current structures */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Current Structures</label>
          {userStructureIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              User has no structure access.
            </p>
          ) : (
            <div className="space-y-2">
              {userStructureIds.map((structureId) => (
                <div
                  key={structureId}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <span className="font-medium">
                    {getStructureName(structureId)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveStructure(structureId)}
                    disabled={actionInProgress === structureId}
                  >
                    {actionInProgress === structureId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add new structure */}
        <div className="space-y-2 pt-4 border-t">
          <label className="text-sm font-medium">Add Structure</label>
          {loadingStructures ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading structures...
            </div>
          ) : availableStructures.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              User has access to all available structures.
            </p>
          ) : (
            <div className="flex gap-2">
              <Select
                value={selectedStructure}
                onValueChange={setSelectedStructure}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a structure" />
                </SelectTrigger>
                <SelectContent>
                  {availableStructures.map((structure) => (
                    <SelectItem key={structure.id} value={structure.id}>
                      {structure.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddStructure}
                disabled={!selectedStructure || actionInProgress}
              >
                {actionInProgress === selectedStructure ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
