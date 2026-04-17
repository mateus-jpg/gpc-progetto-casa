import { CreateCombobox } from "@/components/form/Combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSectionConfig } from "@/context/FormConfigContext";
import { ConfiguredField } from "./ConfigurableField";

export default function ReferralSection({ formData, handleChange }) {
  const sectionConfig = useSectionConfig("referral");

  // Don't render if section is disabled
  if (!sectionConfig || !sectionConfig.enabled) {
    return null;
  }

  const data = formData.referral;
  const onChange = (field, value) => handleChange("referral", field, value);
  const sectionId = "referral";

  return (
    <Card className="shadow-sm gap-2 h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="w-6 h-6 bg-cyan-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
            {sectionConfig.order}
          </span>
          {sectionConfig.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 space-y-6">
        <ConfiguredField
          sectionId={sectionId}
          fieldId="referral"
          formData={formData}
        >
          {({ fieldConfig }) => (
            <CreateCombobox
              label={`${fieldConfig.label}${fieldConfig.isRequired ? " *" : ""}`}
              value={data.referral}
              onChange={(v) => onChange("referral", v)}
              options={fieldConfig.options}
              placeholder={fieldConfig.placeholder}
            />
          )}
        </ConfiguredField>

        {/* Conditional field - referralAltro shown when referral is "Ente partner" or "Altro" */}
        {(data.referral === "Ente partner" || data.referral === "Altro") && (
          <ConfiguredField
            sectionId={sectionId}
            fieldId="referralAltro"
            formData={formData}
          >
            {({ fieldConfig }) => (
              <div className="space-y-2">
                <Label htmlFor="referralAltro">
                  {fieldConfig.label}
                  {fieldConfig.isRequired ? " *" : ""}
                </Label>
                <Input
                  id="referralAltro"
                  placeholder={fieldConfig.placeholder}
                  value={data.referralAltro}
                  onChange={(e) => onChange("referralAltro", e.target.value)}
                  required={fieldConfig.isRequired}
                />
              </div>
            )}
          </ConfiguredField>
        )}
      </CardContent>
    </Card>
  );
}
