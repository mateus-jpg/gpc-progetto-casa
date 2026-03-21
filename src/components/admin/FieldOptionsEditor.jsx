"use client"

import { useState, useCallback } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { IconPlus, IconTrash, IconRefresh } from "@tabler/icons-react"

/**
 * Component for editing field dropdown options
 * Allows selecting a subset of defaults or adding custom options
 */
export function FieldOptionsEditor({
    defaultOptions = [],
    currentOptions,
    onChange
}) {
    const [newOption, setNewOption] = useState("")

    // Determine which options are currently selected
    const isUsingDefaults = currentOptions === null || currentOptions === undefined
    const selectedOptions = isUsingDefaults ? defaultOptions : currentOptions

    // Custom options are those not in defaults
    const customOptions = isUsingDefaults
        ? []
        : currentOptions.filter(opt => !defaultOptions.includes(opt))

    // Selected defaults are those from defaults that are in current options
    const selectedDefaults = isUsingDefaults
        ? defaultOptions
        : currentOptions.filter(opt => defaultOptions.includes(opt))

    // Toggle a default option
    const toggleDefaultOption = useCallback((option, checked) => {
        let newSelected
        if (checked) {
            newSelected = [...selectedDefaults, option, ...customOptions]
        } else {
            newSelected = [...selectedDefaults.filter(o => o !== option), ...customOptions]
        }
        // Sort by original order
        newSelected.sort((a, b) => {
            const indexA = defaultOptions.indexOf(a)
            const indexB = defaultOptions.indexOf(b)
            if (indexA === -1 && indexB === -1) return 0
            if (indexA === -1) return 1
            if (indexB === -1) return -1
            return indexA - indexB
        })
        onChange(newSelected.length === defaultOptions.length && customOptions.length === 0 ? null : newSelected)
    }, [selectedDefaults, customOptions, defaultOptions, onChange])

    // Add a custom option
    const addCustomOption = useCallback(() => {
        if (!newOption.trim()) return
        const trimmed = newOption.trim()

        // Check if already exists
        if (selectedOptions.some(opt => opt.toLowerCase() === trimmed.toLowerCase())) {
            return
        }

        const newSelected = [...selectedDefaults, ...customOptions, trimmed]
        onChange(newSelected)
        setNewOption("")
    }, [newOption, selectedDefaults, customOptions, selectedOptions, onChange])

    // Remove a custom option
    const removeCustomOption = useCallback((option) => {
        const newCustom = customOptions.filter(o => o !== option)
        const newSelected = [...selectedDefaults, ...newCustom]
        onChange(newSelected.length === defaultOptions.length && newCustom.length === 0 ? null : newSelected)
    }, [selectedDefaults, customOptions, defaultOptions, onChange])

    // Reset to use all defaults
    const resetToDefaults = useCallback(() => {
        onChange(null)
    }, [onChange])

    // Select all defaults
    const selectAll = useCallback(() => {
        onChange([...defaultOptions, ...customOptions])
    }, [defaultOptions, customOptions, onChange])

    // Deselect all
    const deselectAll = useCallback(() => {
        onChange(customOptions.length > 0 ? customOptions : [])
    }, [customOptions, onChange])

    return (
        <div className="space-y-4">
            {/* Header with actions */}
            <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Opzioni Disponibili</Label>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAll}>
                        Seleziona tutto
                    </Button>
                    <Button variant="ghost" size="sm" onClick={deselectAll}>
                        Deseleziona tutto
                    </Button>
                    {!isUsingDefaults && (
                        <Button variant="ghost" size="sm" onClick={resetToDefaults}>
                            <IconRefresh className="h-4 w-4 mr-1" />
                            Ripristina
                        </Button>
                    )}
                </div>
            </div>

            {/* Default options checkboxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 border rounded-lg bg-muted/30">
                {defaultOptions.map((option, index) => (
                    <label
                        key={`${option}-${index}`}
                        className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-muted cursor-pointer"
                    >
                        <Checkbox
                            checked={selectedDefaults.includes(option)}
                            onCheckedChange={(checked) => toggleDefaultOption(option, checked)}
                        />
                        <span className="truncate" title={option}>{option}</span>
                    </label>
                ))}
            </div>

            {/* Custom options */}
            {customOptions.length > 0 && (
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Opzioni Personalizzate</Label>
                    <div className="space-y-1">
                        {customOptions.map((option, index) => (
                            <div key={`custom-${index}`} className="flex items-center justify-between p-2 border rounded">
                                <span className="text-sm">{option}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeCustomOption(option)}
                                    className="text-destructive hover:text-destructive"
                                >
                                    <IconTrash className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add custom option */}
            <div className="space-y-2">
                <Label className="text-sm font-medium">Aggiungi Opzione Personalizzata</Label>
                <div className="flex gap-2">
                    <Input
                        value={newOption}
                        onChange={(e) => setNewOption(e.target.value)}
                        placeholder="Nuova opzione..."
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                addCustomOption()
                            }
                        }}
                    />
                    <Button onClick={addCustomOption} disabled={!newOption.trim()}>
                        <IconPlus className="h-4 w-4 mr-1" />
                        Aggiungi
                    </Button>
                </div>
            </div>

            {/* Summary */}
            <div className="text-xs text-muted-foreground pt-2 border-t">
                {isUsingDefaults ? (
                    <span>Usando tutte le opzioni predefinite ({defaultOptions.length})</span>
                ) : (
                    <span>
                        {selectedDefaults.length} opzioni predefinite selezionate
                        {customOptions.length > 0 && ` + ${customOptions.length} personalizzate`}
                    </span>
                )}
            </div>
        </div>
    )
}

export default FieldOptionsEditor
