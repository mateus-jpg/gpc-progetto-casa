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
import { addExistingStructureToProject, getAvailableStructuresForProject } from "@/actions/admin/project"
import { Loader2, Link as LinkIcon, Building2 } from "lucide-react"
import { toast } from "sonner"

export function AddExistingStructureToProjectDialog({ projectId }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [fetchingStructures, setFetchingStructures] = useState(false)
    const [availableStructures, setAvailableStructures] = useState([])
    const [selectedStructureId, setSelectedStructureId] = useState("")

    const fetchAvailableStructures = useCallback(async () => {
        setFetchingStructures(true)
        try {
            const result = await getAvailableStructuresForProject(projectId)

            if (result.success) {
                setAvailableStructures(result.structures || [])
            } else {
                toast.error(result.error || "Failed to fetch structures")
            }
        } catch (error) {
            toast.error("Failed to fetch structures")
        } finally {
            setFetchingStructures(false)
        }
    }, [projectId])

    useEffect(() => {
        if (open) {
            fetchAvailableStructures()
        }
    }, [open, fetchAvailableStructures])

    const handleSubmit = async () => {
        if (!selectedStructureId) {
            toast.error("Please select a structure")
            return
        }

        setLoading(true)
        try {
            const result = await addExistingStructureToProject(projectId, selectedStructureId)
            if (result.success) {
                toast.success("Structure added to project")
                setOpen(false)
                setSelectedStructureId("")
                // Trigger a page refresh to update the table
                window.location.reload()
            } else {
                toast.error(result.error || "Failed to add structure")
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
                <Button variant="outline">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Add Existing Structure
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Existing Structure to Project</DialogTitle>
                    <DialogDescription>
                        Select a structure you administer to add to this project.
                        Only structures that are not already assigned to a project are shown.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="structure">Select Structure</Label>
                        {fetchingStructures ? (
                            <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                        ) : availableStructures.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No available structures to add. You need to be an admin of a structure
                                that is not already assigned to a project.
                            </p>
                        ) : (
                            <Select value={selectedStructureId} onValueChange={setSelectedStructureId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a structure..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableStructures.map((structure) => (
                                        <SelectItem key={structure.id} value={structure.id}>
                                            <div className="flex flex-col">
                                                <span>{structure.name}</span>
                                                {structure.city && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {structure.city}
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
                        disabled={loading || !selectedStructureId || availableStructures.length === 0}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Building2 className="h-4 w-4 mr-2" />
                        )}
                        Add Structure
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
