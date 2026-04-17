"use client";

import { useCallback, useState } from "react";

export function useAnagraficaForm(initialState) {
  const [formData, setFormData] = useState(initialState);

  const handleChange = useCallback((group, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [field]: value,
      },
    }));
  }, []);

  return {
    formData,
    setFormData,
    handleChange,
  };
}
