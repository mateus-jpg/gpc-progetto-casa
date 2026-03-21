"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { addUserToProject, getUsersByProject } from "@/actions/admin/project"
import { listAllUsers } from "@/actions/admin/users"
import { Loader2, Plus, UserPlus } from "lucide-react"
import { toast } from "sonner"

export function AddUserToProjectDialog({ projectId }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [fetchingUsers, setFetchingUsers] = useState(false)
    const [availableUsers, setAvailableUsers] = useState([])
    const [selectedUserId, setSelectedUserId] = useState("")

    const fetchAvailableUsers = useCallback(async () => {
        setFetchingUsers(true)
        try {
            // Get all users and project users
            const [allUsersResult, projectUsersResult] = await Promise.all([
                listAllUsers(),
                getUsersByProject(projectId),
            ])

            if (allUsersResult.users && projectUsersResult.success) {
                // Filter out users already in the project
                const projectUserIds = new Set(projectUsersResult.users.map(u => u.uid))
                const available = allUsersResult.users.filter(
                    user => !projectUserIds.has(user.uid) && user.role !== 'admin'
                )
                setAvailableUsers(available)
            }
        } catch (error) {
            toast.error("Failed to fetch users")
        } finally {
            setFetchingUsers(false)
        }
    }, [projectId])

    useEffect(() => {
        if (open) {
            fetchAvailableUsers()
        }
    }, [open, fetchAvailableUsers])

    const handleSubmit = async () => {
        if (!selectedUserId) {
            toast.error("Please select a user")
            return
        }

        setLoading(true)
        try {
            const result = await addUserToProject(projectId, selectedUserId)
            if (result.success) {
                toast.success("User added to project")
                setOpen(false)
                setSelectedUserId("")
                // Trigger a page refresh to update the table
                window.location.reload()
            } else {
                toast.error(result.error || "Failed to add user")
            }
        } catch (error) {
            toast.error("An error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add User to Project</DialogTitle>
                    <DialogDescription>
                        Select a user to add to this project. They will be able to access
                        structures within this project.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="user">Select User</Label>
                        {fetchingUsers ? (
                            <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                        ) : availableUsers.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No available users to add. All users are already in this project.
                            </p>
                        ) : (
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a user..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableUsers.map((user) => (
                                        <SelectItem key={user.uid} value={user.uid}>
                                            <div className="flex flex-col">
                                                <span>{user.email}</span>
                                                {user.displayName && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {user.displayName}
                                                    </span>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !selectedUserId || availableUsers.length === 0}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <UserPlus className="h-4 w-4 mr-2" />
                        )}
                        Add User
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
