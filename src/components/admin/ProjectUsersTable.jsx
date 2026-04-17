"use client";

import { Building2, Loader2, Shield, ShieldOff, UserMinus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getUsersByProject,
  removeUserFromProject,
  toggleProjectAdminStatus,
} from "@/actions/admin/project";
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

export function ProjectUsersTable({ projectId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getUsersByProject(projectId);
      if (result.success) {
        setUsers(result.users);
      } else {
        toast.error("Failed to fetch users");
      }
    } catch (error) {
      toast.error("Failed to fetch users. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleAdmin = async (userId, isCurrentlyAdmin) => {
    setActionLoading(userId);
    try {
      const result = await toggleProjectAdminStatus(
        projectId,
        userId,
        !isCurrentlyAdmin,
      );
      if (result.success) {
        toast.success(
          isCurrentlyAdmin ? "Admin role removed" : "Admin role granted",
        );
        fetchUsers();
      } else {
        toast.error(result.error || "Failed to update admin status");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveUser = async (userId) => {
    setActionLoading(userId);
    try {
      const result = await removeUserFromProject(projectId, userId);
      if (result.success) {
        toast.success("User removed from project");
        fetchUsers();
      } else {
        toast.error(result.error || "Failed to remove user");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        No users found in this project. Add users to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Structures</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.uid}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>{user.displayName || "-"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Badge
                      variant={user.role === "admin" ? "default" : "secondary"}
                    >
                      {user.role}
                    </Badge>
                    {user.isProjectAdmin && (
                      <Badge
                        variant="outline"
                        className="text-blue-600 border-blue-600"
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        Project Admin
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    <Building2 className="h-3 w-3 mr-1" />
                    {user.structureIds?.length || 0}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {user.role !== "admin" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleToggleAdmin(user.uid, user.isProjectAdmin)
                        }
                        disabled={actionLoading === user.uid}
                      >
                        {actionLoading === user.uid ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : user.isProjectAdmin ? (
                          <>
                            <ShieldOff className="h-4 w-4 mr-1" />
                            Remove Admin
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4 mr-1" />
                            Make Admin
                          </>
                        )}
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={actionLoading === user.uid}
                          >
                            <UserMinus className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remove user from project?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove {user.email} from this project
                              and all its structures. This action cannot be
                              undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveUser(user.uid)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
