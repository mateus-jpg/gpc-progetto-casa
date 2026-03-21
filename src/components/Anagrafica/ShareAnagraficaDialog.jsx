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
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { shareAnagraficaWithStructures, getAvailableStructuresForSharing } from "@/actions/anagrafica/anagrafica"
import { Loader2, Share2, Building2, Users } from "lucide-react"
import { toast } from "sonner"

export function ShareAnagraficaDialog({ anagraficaId, structureId, anagraficaName }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [fetchingStructures, setFetchingStructures] = useState(false)
    const [availableStructures, setAvailableStructures] = useState([])
    const [selectedStructureIds, setSelectedStructureIds] = useState([])

    const fetchAvailableStructures = useCallback(async () => {
        setFetchingStructures(true)
        try {
            const result = await getAvailableStructuresForSharing(anagraficaId, structureId)

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
    }, [anagraficaId, structureId])

    useEffect(() => {
        if (open) {
            setSelectedStructureIds([])
            fetchAvailableStructures()
        }
    }, [open, fetchAvailableStructures])

    const handleCheckboxChange = (structureId, checked) => {
        if (checked) {
            setSelectedStructureIds(prev => [...prev, structureId])
        } else {
            setSelectedStructureIds(prev => prev.filter(id => id !== structureId))
        }
    }

    const handleSubmit = async () => {
        if (selectedStructureIds.length === 0) {
            toast.error("Please select at least one structure")
            return
        }

        setLoading(true)
        try {
            const result = await shareAnagraficaWithStructures(
                anagraficaId,
                structureId,
                selectedStructureIds
            )

            if (result.success) {
                toast.success(`Anagrafica shared with ${result.addedCount} structure(s)`)
                setOpen(false)
                setSelectedStructureIds([])
                // Optionally refresh the page
                window.location.reload()
            } else {
                toast.error(result.error || "Failed to share anagrafica")
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
                    <Share2 className="h-4 w-4 mr-2" />
                    Condividi
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Condividi Anagrafica</DialogTitle>
                    <DialogDescription>
                        {anagraficaName ? (
                            <>Condividi la scheda di <strong>{anagraficaName}</strong> con altre strutture.</>
                        ) : (
                            <>Seleziona le strutture con cui condividere questa anagrafica.</>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {fetchingStructures ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : availableStructures.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">
                            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="font-medium">Nessuna struttura disponibile</p>
                            <p className="text-sm mt-2">
                                L'anagrafica e gia condivisa con tutte le strutture disponibili,
                                oppure non hai accesso ad altre strutture.
                            </p>
                        </div>
                    ) : (
                        <ScrollArea className="h-[300px] pr-4">
                            <div className="space-y-3">
                                {availableStructures.map((structure) => (
                                    <div
                                        key={structure.id}
                                        className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                    >
                                        <Checkbox
                                            id={structure.id}
                                            checked={selectedStructureIds.includes(structure.id)}
                                            onCheckedChange={(checked) =>
                                                handleCheckboxChange(structure.id, checked)
                                            }
                                        />
                                        <div className="flex-1 min-w-0">
                                            <Label
                                                htmlFor={structure.id}
                                                className="font-medium cursor-pointer block"
                                            >
                                                {structure.name}
                                            </Label>
                                            {structure.city && (
                                                <p className="text-sm text-muted-foreground">
                                                    {structure.city}
                                                </p>
                                            )}
                                            <div className="flex gap-2 mt-1">
                                                {structure.isUserStructure && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        <Users className="h-3 w-3 mr-1" />
                                                        Tua struttura
                                                    </Badge>
                                                )}
                                                {structure.isSameProject && !structure.isUserStructure && (
                                                    <Badge variant="outline" className="text-xs">
                                                        Stesso progetto
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Annulla
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || selectedStructureIds.length === 0 || availableStructures.length === 0}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Share2 className="h-4 w-4 mr-2" />
                        )}
                        Condividi ({selectedStructureIds.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
