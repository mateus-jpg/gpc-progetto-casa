import {
  CreateCombobox,
  CreateMultiCombobox,
} from "@/components/form/Combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSectionConfig } from "@/context/FormConfigContext";
import { ConfiguredField } from "./ConfigurableField";

export default function LegalStatusSection({ formData, handleChange }) {
  const sectionConfig = useSectionConfig("legalStatus");

  // Don't render if section is disabled
  if (!sectionConfig || !sectionConfig.enabled) {
    return null;
  }

  const data = formData.legaleAbitativa;
  const onChange = (field, value) =>
    handleChange("legaleAbitativa", field, value);
  const sectionId = "legalStatus";

  return (
    <Card className="shadow-sm gap-2 h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
            {sectionConfig.order}
          </span>
          {sectionConfig.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ConfiguredField
            sectionId={sectionId}
            fieldId="situazioneLegale"
            formData={formData}
          >
            {({ fieldConfig }) => (
              <CreateCombobox
                label={`${fieldConfig.label}${fieldConfig.isRequired ? " *" : ""}`}
                value={data.situazioneLegale}
                onChange={(v) => onChange("situazioneLegale", v)}
                options={fieldConfig.options}
                placeholder={fieldConfig.placeholder}
              />
            )}
          </ConfiguredField>

          <ConfiguredField
            sectionId={sectionId}
            fieldId="situazioneAbitativa"
            formData={formData}
          >
            {({ fieldConfig }) => (
              <CreateMultiCombobox
                label={`${fieldConfig.label}${fieldConfig.isRequired ? " *" : ""} (risposte multiple)`}
                values={data.situazioneAbitativa}
                onChange={(val) => onChange("situazioneAbitativa", val)}
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
