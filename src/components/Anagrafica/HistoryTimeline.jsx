"use client"

import { useState, useEffect } from "react"
import { getAnagraficaHistory } from "@/actions/anagrafica/history"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { IconChevronDown, IconChevronRight, IconHistory, IconUser, IconBuilding } from "@tabler/icons-react"
import { format } from "date-fns"
import { it } from "date-fns/locale"

// Map group names to Italian labels
const GROUP_LABELS = {
    anagrafica: "Dati Personali",
    nucleoFamiliare: "Nucleo Familiare",
    legaleAbitativa: "Situazione Legale e Abitativa",
    lavoroFormazione: "Lavoro e Formazione",
    vulnerabilita: "Vulnerabilità",
    referral: "Referral"
}

// Map field names to Italian labels for display
const FIELD_LABELS = {
    // Anagrafica
    nome: "Nome",
    cognome: "Cognome",
    sesso: "Sesso",
    dataDiNascita: "Data di Nascita",
    luogoDiNascita: "Luogo di Nascita",
    cittadinanza: "Cittadinanza",
    comuneDiDomicilio: "Comune di Domicilio",
    telefono: "Telefono",
    email: "Email",
    // Nucleo Familiare
    nucleo: "Tipo Nucleo",
    nucleoTipo: "Composizione Nucleo",
    figli: "Numero Figli",
    // Legale Abitativa
    situazioneLegale: "Situazione Legale",
    situazioneAbitativa: "Situazione Abitativa",
    // Lavoro Formazione
    situazioneLavorativa: "Situazione Lavorativa",
    titoloDiStudioOrigine: "Titolo di Studio (Origine)",
    titoloDiStudioItalia: "Titolo di Studio (Italia)",
    conoscenzaItaliano: "Conoscenza Italiano",
    // Vulnerabilità
    vulnerabilita: "Vulnerabilità",
    intenzioneItalia: "Intenzione Italia",
    paeseDestinazione: "Paese di Destinazione",
    // Referral
    referral: "Referral",
    referralAltro: "Referral (Altro)"
}

function formatValue(value) {
    if (value === null || value === undefined) return "-"
    if (Array.isArray(value)) return value.join(", ") || "-"
    if (typeof value === "boolean") return value ? "Sì" : "No"
    if (typeof value === "object") {
        // Handle date objects
        if (value.seconds || value._seconds) {
            const timestamp = value.seconds || value._seconds
            return format(new Date(timestamp * 1000), "dd/MM/yyyy", { locale: it })
        }
        return JSON.stringify(value)
    }
    return String(value)
}

function formatDate(dateValue) {
    if (!dateValue) return "-"
    try {
        let date
        if (typeof dateValue === "string") {
            date = new Date(dateValue)
        } else if (dateValue.seconds || dateValue._seconds) {
            const timestamp = dateValue.seconds || dateValue._seconds
            date = new Date(timestamp * 1000)
        } else if (dateValue instanceof Date) {
            date = dateValue
        } else {
            return "-"
        }
        return format(date, "dd MMMM yyyy 'alle' HH:mm", { locale: it })
    } catch {
        return "-"
    }
}

export function HistoryTimeline({ anagraficaId, structureId = null }) {
    const [entries, setEntries] = useState([])
    const [loading, setLoading] = useState(true)
    const [hasMore, setHasMore] = useState(false)
    const [lastTimestamp, setLastTimestamp] = useState(null)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState(null)

    // Initial load
    useEffect(() => {
        async function loadHistory() {
            setLoading(true)
            setError(null)
            try {
                // API: getAnagraficaHistory(anagraficaId, structureId, limit, startAfterTimestamp)
                const result = await getAnagraficaHistory(anagraficaId, structureId, 20, null)
                const data = JSON.parse(result)
                setEntries(data.entries || [])
                setHasMore(data.hasMore || false)
                setLastTimestamp(data.lastTimestamp)
            } catch (err) {
                console.error("Error loading history:", err)
                setError("Errore durante il caricamento della cronologia")
            } finally {
                setLoading(false)
            }
        }
        loadHistory()
    }, [anagraficaId, structureId])

    // Load more entries
    const loadMore = async () => {
        if (loadingMore || !hasMore) return
        setLoadingMore(true)
        try {
            const result = await getAnagraficaHistory(anagraficaId, structureId, 20, lastTimestamp)
            const data = JSON.parse(result)
            setEntries(prev => [...prev, ...(data.entries || [])])
            setHasMore(data.hasMore || false)
            setLastTimestamp(data.lastTimestamp)
        } catch (err) {
            console.error("Error loading more history:", err)
        } finally {
            setLoadingMore(false)
        }
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <IconHistory className="h-5 w-5" />
                        Cronologia Modifiche
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <IconHistory className="h-5 w-5" />
                        Cronologia Modifiche
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive text-center py-4">{error}</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <IconHistory className="h-5 w-5" />
                    Cronologia Modifiche
                </CardTitle>
                <CardDescription>
                    {entries.length === 0
                        ? "Nessuna modifica registrata"
                        : `${entries.length} ${entries.length === 1 ? 'modifica' : 'modifiche'} registrate`}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {entries.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                        Non ci sono ancora modifiche registrate per questa scheda.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {entries.map((entry) => (
                            <HistoryEntry key={entry.id} entry={entry} />
                        ))}

                        {hasMore && (
                            <div className="text-center pt-4">
                                <Button
                                    variant="outline"
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                >
                                    {loadingMore ? "Caricamento..." : "Carica altre modifiche"}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

const CHANGE_TYPE_LABELS = {
    create: "Creazione",
    update: "Modifica",
    delete: "Eliminazione"
}

function HistoryEntry({ entry }) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="border rounded-lg">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                    <div className="flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="mt-0.5">
                            {isOpen ? (
                                <IconChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                                <IconChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">
                                    {CHANGE_TYPE_LABELS[entry.changeType] || entry.changeType}
                                </span>
                                <span className="text-muted-foreground">-</span>
                                <span className="text-sm text-muted-foreground">
                                    {entry.changedGroups?.map(g => GROUP_LABELS[g] || g).join(", ")}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                    <IconUser className="h-4 w-4" />
                                    {entry.changedByMail || entry.changedBy || "Sconosciuto"}
                                </span>
                                {entry.changedByStructure && (
                                    <span className="flex items-center gap-1">
                                        <IconBuilding className="h-4 w-4" />
                                        {entry.changedByStructure}
                                    </span>
                                )}
                                <span>{formatDate(entry.changedAt)}</span>
                            </div>
                        </div>
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="px-4 pb-4 pt-0 pl-12">
                        {entry.changes && Object.keys(entry.changes).length > 0 ? (
                            <div className="space-y-4">
                                {Object.entries(entry.changes).map(([groupName, { before, after }]) => (
                                    <GroupChanges
                                        key={groupName}
                                        groupName={groupName}
                                        before={before}
                                        after={after}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Dettagli delle modifiche non disponibili
                            </p>
                        )}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    )
}

function isEmptyValue(value) {
    if (value === null || value === undefined) return true
    if (value === "" || value === 0) return true
    if (Array.isArray(value) && value.length === 0) return true
    return false
}

function GroupChanges({ groupName, before, after }) {
    // Get all unique keys from both before and after
    const allKeys = new Set([
        ...Object.keys(before || {}),
        ...Object.keys(after || {})
    ])

    // Filter to only show fields that actually changed
    // Also include fields that went from empty to a value or vice versa
    const changedFields = Array.from(allKeys).filter(key => {
        const beforeVal = before?.[key]
        const afterVal = after?.[key]

        // Skip if both are empty/meaningless
        if (isEmptyValue(beforeVal) && isEmptyValue(afterVal)) return false

        // Show if values are different (including empty-to-value transitions)
        return JSON.stringify(beforeVal) !== JSON.stringify(afterVal)
    })

    if (changedFields.length === 0) {
        return null
    }

    return (
        <div>
            <h4 className="font-medium text-sm mb-2">
                {GROUP_LABELS[groupName] || groupName}
            </h4>
            <div className="bg-muted/30 rounded-md p-3 space-y-2">
                {changedFields.map(field => (
                    <div key={field} className="text-sm">
                        <span className="font-medium">{FIELD_LABELS[field] || field}:</span>
                        <div className="flex flex-wrap gap-2 mt-1 pl-2">
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs line-through">
                                {formatValue(before?.[field])}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                                {formatValue(after?.[field])}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default HistoryTimeline
