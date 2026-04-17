"use client";

import { useEffect, useState } from "react";
import { getStructureFormConfig } from "@/actions/admin/structure";

export function useStructureFormConfig(structureId) {
  const [formConfig, setFormConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadConfig() {
      if (!structureId) {
        if (isMounted) {
          setFormConfig(null);
          setConfigLoading(false);
        }
        return;
      }

      try {
        const config = await getStructureFormConfig(structureId);
        if (isMounted) {
          setFormConfig(config);
        }
      } catch (error) {
        console.error("Error loading form config:", error);
      } finally {
        if (isMounted) {
          setConfigLoading(false);
        }
      }
    }

    setConfigLoading(true);
    loadConfig();

    return () => {
      isMounted = false;
    };
  }, [structureId]);

  return {
    formConfig,
    configLoading,
  };
}
