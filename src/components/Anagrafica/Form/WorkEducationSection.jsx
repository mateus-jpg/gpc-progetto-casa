import { CreateCombobox } from "@/components/form/Combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSectionConfig } from "@/context/FormConfigContext";
import { ConfiguredField } from "./ConfigurableField";

export default function WorkEducationSection({ formData, handleChange }) {
  const sectionConfig = useSectionConfig("workEducation");

  // Don't render if section is disabled
  if (!sectionConfig || !sectionConfig.enabled) {
    return null;
  }

  const data = formData.lavoroFormazione;
  const onChange = (field, value) =>
    handleChange("lavoroFormazione", field, value);
  const sectionId = "workEducation";

  return (
    <Card className="shadow-sm gap-2 h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
            {sectionConfig.order}
          </span>
          {sectionConfig.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ConfiguredField
            sectionId={sectionId}
            fieldId="situazioneLavorativa"
            formData={formData}
          >
            {({ fieldConfig }) => (
              <CreateCombobox
                label={`${fieldConfig.label}${fieldConfig.isRequired ? " *" : ""}`}
                value={data.situazioneLavorativa}
                onChange={(v) => onChange("situazioneLavorativa", v)}
                options={fieldConfig.options}
                placeholder={fieldConfig.placeholder}
              />
            )}
          </ConfiguredField>

          <ConfiguredField
            sectionId={sectionId}
            fieldId="titoloDiStudioOrigine"
            formData={formData}
          >
            {({ fieldConfig }) => (
              <CreateCombobox
                label={`${fieldConfig.label}${fieldConfig.isRequired ? " *" : ""}`}
                value={data.titoloDiStudioOrigine}
                onChange={(v) => onChange("titoloDiStudioOrigine", v)}
                options={fieldConfig.options}
                placeholder={fieldConfig.placeholder}
              />
            )}
          </ConfiguredField>

          <ConfiguredField
            sectionId={sectionId}
            fieldId="titoloDiStudioItalia"
            formData={formData}
          >
            {({ fieldConfig }) => (
              <CreateCombobox
                label={`${fieldConfig.label}${fieldConfig.isRequired ? " *" : ""}`}
                value={data.titoloDiStudioItalia}
                onChange={(v) => onChange("titoloDiStudioItalia", v)}
                options={fieldConfig.options}
                placeholder={fieldConfig.placeholder}
              />
            )}
          </ConfiguredField>

          <ConfiguredField
            sectionId={sectionId}
            fieldId="conoscenzaItaliano"
            formData={formData}
          >
            {({ fieldConfig }) => (
              <CreateCombobox
                label={`${fieldConfig.label}${fieldConfig.isRequired ? " *" : ""}`}
                value={data.conoscenzaItaliano}
                onChange={(v) => onChange("conoscenzaItaliano", v)}
                options={fieldConfig.options}
                placeholder={fieldConfig.placeholder}
              />
            )}
          </ConfiguredField>
        </div>
      </CardContent>
    </Card>
  );
}
