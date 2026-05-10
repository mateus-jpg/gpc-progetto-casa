"use client";

import { Eye, Loader2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getStructuresByProject } from "@/actions/admin/project";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ProjectStructuresTable({ projectId }) {
  const router = useRouter();
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStructures = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getStructuresByProject(projectId);
      if (result.success) {
        setStructures(result.structures);
      } else {
        toast.error("Failed to fetch structures");
      }
    } catch (_error) {
      toast.error("Failed to fetch structures. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchStructures();
  }, [fetchStructures]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (structures.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        No structures found in this project. Create one to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Admins</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {structures.map((structure) => (
              <TableRow key={structure.id}>
                <TableCell className="font-medium">{structure.name}</TableCell>
                <TableCell>{structure.city || "-"}</TableCell>
                <TableCell>{structure.email || "-"}</TableCell>
                <TableCell>{structure.phone || "-"}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    <Users className="h-3 w-3 mr-1" />
                    {structure.admins?.length || 0}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/${structure.id}/admin`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Manage
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
