import { CreateCombobox } from "@/components/form/Combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSectionConfig } from "@/context/FormConfigContext";
import { ConfiguredField } from "./ConfigurableField";

export default function FamilyUnitSection({ formData, handleChange }) {
  const sectionConfig = useSectionConfig("familyUnit");

  // Don't render if section is disabled
  if (!sectionConfig || !sectionConfig.enabled) {
    return null;
  }

  const data = formData.nucleoFamiliare;
  const onChange = (field, value) =>
    handleChange("nucleoFamiliare", field, value);
  const sectionId = "familyUnit";

  return (
    <Card className="shadow-sm gap-2 h-full">
      <CardHeader className="gap-1">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
            {sectionConfig.order}
          </span>
          {sectionConfig.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-4">
          <ConfiguredField
            sectionId={sectionId}
            fieldId="nucleo"
            formData={formData}
          >
            {({ fieldConfig }) => (
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  {fieldConfig.label}
                  {fieldConfig.isRequired ? " *" : ""}
                </Label>
                <RadioGroup
                  onValueChange={(v) => onChange("nucleo", v)}
                  value={data.nucleo}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="singolo" id="singolo" />
                    <Label htmlFor="singolo" className="cursor-pointer flex-1">
                      <div className="font-medium">Persona singola</div>
                      <div className="text-sm text-gray-500">
                        Vivo da solo/a
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="famiglia" id="famiglia" />
                    <Label htmlFor="famiglia" className="cursor-pointer flex-1">
                      <div className="font-medium">Nucleo familiare</div>
                      <div className="text-sm text-gray-500">
                        Faccio parte di una famiglia
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </ConfiguredField>

          {/* Conditional fields shown when nucleo === 'famiglia' */}
          {data.nucleo === "famiglia" && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border-l-4 border-green-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ConfiguredField
                  sectionId={sectionId}
                  fieldId="nucleoTipo"
                  formData={formData}
                >
                  {({ fieldConfig }) => (
                    <CreateCombobox
                      label={`${fieldConfig.label}${fieldConfig.isRequired ? " *" : ""}`}
                      value={data.nucleoTipo}
                      onChange={(v) => onChange("nucleoTipo", v)}
                      options={fieldConfig.options}
                      placeholder={fieldConfig.placeholder}
                    />
                  )}
                </ConfiguredField>
                <ConfiguredField
                  sectionId={sectionId}
                  fieldId="figli"
                  formData={formData}
                >
                  {({ fieldConfig }) => (
                    <div className="space-y-2">
                      <Label htmlFor="figli">
                        {fieldConfig.label}
                        {fieldConfig.isRequired ? " *" : ""}
                      </Label>
                      <Input
                        id="figli"
                        type="number"
                        min={fieldConfig.min ?? 0}
                        max={fieldConfig.max ?? 10}
                        value={data.figli}
                        onChange={(e) =>
                          onChange("figli", parseInt(e.target.value) || 0)
                        }
                        placeholder="0"
                        required={fieldConfig.isRequired}
                      />
                    </div>
                  )}
                </ConfiguredField>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
