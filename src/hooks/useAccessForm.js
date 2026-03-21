import { useState, useCallback, useMemo, useEffect } from 'react';
import { AccessTypes as DefaultAccessTypes } from '@/components/Anagrafica/AccessDialog/AccessTypes';
import { convertFileToBase64 } from '@/utils/fileUtils';

function createBlankTypeState() {
    return {
        subCategories: [],
        altroText: "",
        content: "",           // rich-text notes (HTML)
        files: [],             // new files to upload
        existingFiles: [],     // files already in storage
        deletedFilePaths: [],  // storage paths marked for deletion on save
        classification: "",
        referralEntity: "",
        reminderDate: null,
        reminderTime: "",
    };
}

function createInitialState(categories) {
    return (categories || DefaultAccessTypes).reduce((acc, type) => {
        acc[type.value] = createBlankTypeState();
        return acc;
    }, {});
}

/**
 * Map existing services array (from Firestore) into the tab-keyed form state.
 * tipoAccesso is stored as the label string (e.g. "Legale"), matched against category labels.
 */
function mapInitialDataToState(categories, initialData) {
    const state = createInitialState(categories);

    for (const svc of (initialData || [])) {
        const matchedType = (categories || DefaultAccessTypes).find(
            t => t.label === svc.tipoAccesso || t.value === svc.tipoAccesso
        );
        if (!matchedType) continue;

        state[matchedType.value] = {
            subCategories: Array.isArray(svc.sottoCategorie)
                ? svc.sottoCategorie
                : svc.sottoCategorie ? [svc.sottoCategorie] : [],
            altroText: svc.altro || "",
            content: svc.note || "",
            files: [],
            existingFiles: Array.isArray(svc.files) ? svc.files : [],
            deletedFilePaths: [],
            classification: svc.classificazione || "",
            referralEntity: svc.enteRiferimento || "",
            reminderDate: svc.reminderDate ? new Date(svc.reminderDate) : null,
            reminderTime: svc.reminderDate
                ? new Date(svc.reminderDate).toTimeString().slice(0, 5)
                : "",
        };
    }

    return state;
}

export function useAccessForm(categories = null, initialData = null) {
    const accessTypes = useMemo(() => {
        return categories && categories.length > 0 ? categories : DefaultAccessTypes;
    }, [categories]);

    const [accessState, setAccessState] = useState(() =>
        initialData && initialData.length > 0
            ? mapInitialDataToState(accessTypes, initialData)
            : createInitialState(accessTypes)
    );

    // Add slots for newly added category types (e.g. after a custom subcategory is added)
    useEffect(() => {
        setAccessState((prevState) => {
            const newState = { ...prevState };
            let hasChanges = false;
            for (const type of accessTypes) {
                if (!newState[type.value]) {
                    newState[type.value] = createBlankTypeState();
                    hasChanges = true;
                }
            }
            return hasChanges ? newState : prevState;
        });
    }, [accessTypes]);

    const updateAccessField = useCallback((typeVal, field, value) => {
        setAccessState((prev) => ({
            ...prev,
            [typeVal]: { ...prev[typeVal], [field]: value },
        }));
    }, []);

    /** Mark an existing file for deletion on next save. Removes it from existingFiles immediately. */
    const markFileForDeletion = useCallback((typeVal, filePath) => {
        setAccessState((prev) => {
            const current = prev[typeVal];
            if (!current) return prev;
            return {
                ...prev,
                [typeVal]: {
                    ...current,
                    deletedFilePaths: [...current.deletedFilePaths, filePath],
                    existingFiles: current.existingFiles.filter(f => f.path !== filePath),
                }
            };
        });
    }, []);

    const resetAccessForm = useCallback(() => {
        setAccessState(
            initialData && initialData.length > 0
                ? mapInitialDataToState(accessTypes, initialData)
                : createInitialState(accessTypes)
        );
    }, [accessTypes, initialData]);

    const isAccessTypeValid = useCallback((typeVal) => {
        const s = accessState[typeVal];
        if (!s) return false;
        if (s.subCategories.length > 0) {
            if (s.subCategories.includes("Altro") && !s.altroText.trim()) return false;
            return true;
        }
        return false;
    }, [accessState]);

    const getValidAccessTypes = useCallback(() => {
        return accessTypes.filter((t) => isAccessTypeValid(t.value));
    }, [accessTypes, isAccessTypeValid]);

    const prepareAccessPayload = useCallback(async () => {
        const validTypes = getValidAccessTypes();
        return await Promise.all(validTypes.map(async (type) => {
            const state = accessState[type.value];
            const cleanedState = { tipoAccesso: type.label };

            if (state.subCategories.length > 0) cleanedState.sottoCategorie = state.subCategories;
            if (state.subCategories.includes("Altro") && state.altroText.trim())
                cleanedState.altro = state.altroText.trim();
            if (state.content.trim()) cleanedState.note = state.content.trim();
            if (state.classification) cleanedState.classificazione = state.classification;
            if (state.referralEntity) cleanedState.enteRiferimento = state.referralEntity;

            // Pass existing files and deletion list to the server action
            cleanedState.existingFiles = state.existingFiles || [];
            cleanedState.deletedFilePaths = state.deletedFilePaths || [];

            // New files to upload
            if (state.files.length > 0) {
                cleanedState.files = await Promise.all(state.files.map(async (f) => {
                    const base64 = await convertFileToBase64(f.file);
                    return {
                        name: f.name,
                        originalName: f.file.name,
                        creationDate: f.creationDate instanceof Date ? f.creationDate.toISOString() : f.creationDate,
                        expirationDate: f.expirationDate instanceof Date ? f.expirationDate.toISOString() : f.expirationDate,
                        base64,
                        type: f.file.type,
                        size: f.file.size
                    };
                }));
            } else {
                cleanedState.files = [];
            }

            if (state.reminderDate) {
                const date = new Date(state.reminderDate);
                if (state.reminderTime) {
                    const [hours, minutes] = state.reminderTime.split(':');
                    date.setHours(parseInt(hours), parseInt(minutes));
                }
                cleanedState.reminderDate = date.toISOString();
            }

            return cleanedState;
        }));
    }, [accessState, getValidAccessTypes]);

    return {
        accessState,
        updateAccessField,
        markFileForDeletion,
        resetAccessForm,
        isAccessTypeValid,
        getValidAccessTypes,
        prepareAccessPayload
    };
}
