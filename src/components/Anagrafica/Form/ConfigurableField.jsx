"use client";

import { cloneElement } from "react";
import { Label } from "@/components/ui/label";
import {
  useFieldConfig,
  useFieldVisibility,
  useSectionConfig,
} from "@/context/FormConfigContext";

/**
 * Wrapper component that handles field visibility and configuration
 * Use this to wrap form fields to make them configuration-aware
 */
export function ConfigurableField({
  sectionId,
  fieldId,
  formData,
  children,
  className = "",
  showLabel = true,
}) {
  const fieldConfig = useFieldConfig(sectionId, fieldId);
  const isVisible = useFieldVisibility(sectionId, fieldId, formData);

  // Don't render if field doesn't exist in config or is not visible
  if (!fieldConfig || !isVisible) {
    return null;
  }

  // Clone the child element and inject configuration props
  const enhancedChild = cloneElement(children, {
    required: fieldConfig.isRequired,
    placeholder: children.props.placeholder || fieldConfig.placeholder,
    // Pass options if the field accepts them and they're configured
    ...(fieldConfig.options &&
      children.props.options === undefined && {
        options: fieldConfig.options,
      }),
  });

  return (
    <div className={`space-y-2 ${className}`}>
      {showLabel && (
        <Label htmlFor={fieldId} className="flex items-center gap-1">
          {fieldConfig.label}
          {fieldConfig.isRequired && <span className="text-red-500">*</span>}
        </Label>
      )}
      {enhancedChild}
    </div>
  );
}

/**
 * Wrapper component that handles section visibility
 * Use this to wrap entire sections to make them configuration-aware
 */
export function ConfigurableSection({ sectionId, children, className = "" }) {
  const sectionConfig = useSectionConfig(sectionId);

  // Don't render if section doesn't exist or is disabled
  if (!sectionConfig || !sectionConfig.enabled) {
    return null;
  }

  return <div className={className}>{children}</div>;
}

/**
 * Higher-order component to make a form section configurable
 * This provides the section with its configuration and handles visibility
 */
export function withConfigurableSection(WrappedComponent, sectionId) {
  return function ConfiguredSection(props) {
    const sectionConfig = useSectionConfig(sectionId);

    if (!sectionConfig || !sectionConfig.enabled) {
      return null;
    }

    return <WrappedComponent {...props} sectionConfig={sectionConfig} />;
  };
}

/**
 * Hook to get field props for a specific field
 * Returns an object that can be spread onto input components
 */
export function useConfigurableFieldProps(sectionId, fieldId, formData) {
  const fieldConfig = useFieldConfig(sectionId, fieldId);
  const isVisible = useFieldVisibility(sectionId, fieldId, formData);

  if (!fieldConfig || !isVisible) {
    return null;
  }

  return {
    id: fieldId,
    name: fieldId,
    required: fieldConfig.isRequired,
    placeholder: fieldConfig.placeholder,
    label: fieldConfig.label,
    options: fieldConfig.options,
    type: fieldConfig.type,
    min: fieldConfig.min,
    max: fieldConfig.max,
  };
}

/**
 * Render-prop field wrapper used by form sections.
 * Hides the field when it's not configured or not visible.
 * Usage: <ConfiguredField sectionId="x" fieldId="y" formData={data}>{({ fieldConfig }) => ...}</ConfiguredField>
 */
export function ConfiguredField({ sectionId, fieldId, formData, children }) {
  const fieldConfig = useFieldConfig(sectionId, fieldId);
  const isVisible = useFieldVisibility(sectionId, fieldId, formData);

  if (!fieldConfig || !isVisible) return null;

  return children({ fieldConfig });
}

export default ConfigurableField;
