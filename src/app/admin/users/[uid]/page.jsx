"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, ArrowLeft } from "lucide-react"
import { getUser, updateUser } from "@/actions/admin/users"
import { UserStructuresManager } from "@/components/admin/UserStructuresManager"

export default function UserDetailPage() {
    const params = useParams()
    const router = useRouter()
    const uid = params.uid

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [user, setUser] = useState(null)

    // Form state
    const [formData, setFormData] = useState({
        displayName: "",
        phone: "",
        email: "",
        role: "user",
    })

    const fetchUser = useCallback(async () => {
        try {
            const result = await getUser(uid)
            if (result.success) {
                setUser(result.user)
                setFormData({
                    displayName: result.user.displayName || "",
                    phone: result.user.phone || "",
                    email: result.user.email || "",
                    role: result.user.role || "user",
                })
            } else {
                toast.error(result.error || "Failed to load user")
                router.push("/admin/users")
            }
        } catch (error) {
            toast.error("Failed to load user")
            router.push("/admin/users")
        } finally {
            setLoading(false)
        }
    }, [uid, router])

    useEffect(() => {
        fetchUser()
    }, [fetchUser])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleRoleChange = (value) => {
        setFormData(prev => ({ ...prev, role: value }))
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)

        try {
            const result = await updateUser(uid, formData)

            if (result.success) {
                toast.success("User updated successfully")
                fetchUser() // Refresh data
            } else {
                toast.error(result.error || "Failed to update user")
            }
        } catch (error) {
            toast.error("Failed to update user")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="container mx-auto py-10 max-w-3xl">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="container mx-auto py-10 max-w-3xl">
                <p className="text-center text-muted-foreground">User not found</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-10 max-w-3xl space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.push("/admin/users")}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Users
                </Button>
            </div>

            {/* User Info Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>User Details</CardTitle>
                            <CardDescription>
                                Manage user information and settings
                            </CardDescription>
                        </div>
                        <Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'structure_admin' ? 'default' : 'outline'}>
                            {user.role || 'user'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSave} className="space-y-4">
                        {/* UID (read-only) */}
                        <div className="space-y-2">
                            <Label>UID</Label>
                            <Input value={user.uid} disabled className="bg-muted" />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            {/* Display Name */}
                            <div className="space-y-2">
                                <Label htmlFor="displayName">Display Name</Label>
                                <Input
                                    id="displayName"
                                    name="displayName"
                                    value={formData.displayName}
                                    onChange={handleInputChange}
                                />
                            </div>

                            {/* Phone */}
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        {/* Role (only if not super admin) */}
                        {user.role !== 'admin' && (
                            <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>
                                <Select value={formData.role} onValueChange={handleRoleChange}>
                                    <SelectTrigger className="w-full md:w-[300px]">
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="user">User</SelectItem>
                                        <SelectItem value="structure_admin">Structure Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Metadata */}
                        <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
                            <div className="space-y-1">
                                <span className="text-sm text-muted-foreground">Created</span>
                                <p className="text-sm">
                                    {user.metadata?.creationTime
                                        ? new Date(user.metadata.creationTime).toLocaleString()
                                        : '-'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-sm text-muted-foreground">Last Sign In</span>
                                <p className="text-sm">
                                    {user.metadata?.lastSignInTime
                                        ? new Date(user.metadata.lastSignInTime).toLocaleString()
                                        : 'Never'}
                                </p>
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button type="submit" disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Structures Manager (only for non-super-admins) */}
            {user.role !== 'admin' && (
                <UserStructuresManager user={user} onUpdate={fetchUser} />
            )}
        </div>
    )
}
