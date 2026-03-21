"use client"

import { useState, useEffect, useCallback } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { getUsersByStructure, toggleStructureAdminStatus } from "@/actions/admin/structure"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useParams } from "next/navigation"

export function StructureUsersTable() {
    const { structureId } = useParams()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchUsers = useCallback(async () => {
        if (!structureId) return;
        setLoading(true)
        try {
            const result = await getUsersByStructure(structureId)
            setUsers(result)
        } catch (error) {
            toast.error("Failed to load users")
        } finally {
            setLoading(false)
        }
    }, [structureId])

    useEffect(() => {
        fetchUsers()
    }, [fetchUsers])

    const handleToggleAdmin = async (userId, currentStatus) => {
        const action = currentStatus ? "Demote" : "Promote";
        try {
            // Optimistic update
            setUsers(prev => prev.map(u =>
                u.uid === userId ? { ...u, isStructureAdmin: !currentStatus } : u
            ));

            const res = await toggleStructureAdminStatus(structureId, userId, !currentStatus);
            if (!res.success) throw new Error(res.error);

            toast.success(`User ${action}d successfully`);
        } catch (error) {
            toast.error(`Failed to ${action} user`);
            fetchUsers(); // Revert on error
        }
    }

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">Structure Members</h2>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-4">No users found for this structure.</TableCell>
                            </TableRow>
                        )}
                        {users.map((user) => (
                            <TableRow key={user.uid}>
                                <TableCell className="font-medium">
                                    {user.displayName}
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    {user.isStructureAdmin ? (
                                        <Badge variant="default">Admin</Badge>
                                    ) : (
                                        <Badge variant="outline">Member</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant={user.isStructureAdmin ? "destructive" : "outline"}
                                        size="sm"
                                        onClick={() => handleToggleAdmin(user.uid, user.isStructureAdmin)}
                                    >
                                        {user.isStructureAdmin ? "Remove Admin" : "Make Admin"}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {loading && (
                <div className="flex justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            )}
        </div>
    )
}
