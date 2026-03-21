"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { listProjects } from "@/actions/admin/project"
import { Badge } from "@/components/ui/badge"
import { Loader2, Eye, Users, Building2 } from "lucide-react"
import { toast } from "sonner"

export function ProjectsTable() {
    const router = useRouter()
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchProjects = useCallback(async () => {
        setLoading(true)
        try {
            const result = await listProjects()
            if (result.success) {
                setProjects(result.projects)
            } else {
                toast.error("Failed to fetch projects")
            }
        } catch (error) {
            toast.error("Failed to fetch projects. Please try again.")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchProjects()
    }, [fetchProjects])

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        )
    }

    if (projects.length === 0) {
        return (
            <div className="text-center p-8 text-muted-foreground">
                No projects found. Create one to get started.
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Admins</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {projects.map((project) => (
                            <TableRow key={project.id}>
                                <TableCell className="font-medium">{project.name}</TableCell>
                                <TableCell className="max-w-md truncate">
                                    {project.description || "-"}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">
                                        <Users className="h-3 w-3 mr-1" />
                                        {project.admins?.length || 0}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => router.push(`/admin/projects/${project.id}`)}
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
    )
}
