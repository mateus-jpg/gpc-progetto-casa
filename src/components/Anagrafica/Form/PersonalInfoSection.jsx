import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import DatePicker from "@/components/form/DatePicker";
import { CreateCombobox, CreateMultiCombobox } from "@/components/form/Combobox";
import Countries from "@/data/countries.json";
import { useSectionConfig } from "@/context/FormConfigContext";
import { ConfiguredField } from "./ConfigurableField";

export default function PersonalInfoSection({ formData, handleChange }) {
    const sectionConfig = useSectionConfig('personalInfo');

    // Don't render if section is disabled
    if (!sectionConfig || !sectionConfig.enabled) {
        return null;
    }

    const data = formData.anagrafica;
    const onChange = (field, value) => handleChange("anagrafica", field, value);
    const sectionId = 'personalInfo';

    return (
        <Card className="shadow-sm gap-2">
            <CardHeader className="">
                <CardTitle className="text-lg flex items-center gap-2">
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {sectionConfig.order}
                    </span>
                    {sectionConfig.label}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ConfiguredField sectionId={sectionId} fieldId="cognome" formData={formData}>
                        {({ fieldConfig }) => (
                            <div className="space-y-2">
                                <Label htmlFor="cognome">
                                    {fieldConfig.label}{fieldConfig.isRequired ? ' *' : ''}
                                </Label>
                                <Input
                                    id="cognome"
                                    value={data.cognome}
                                    onChange={(e) => onChange("cognome", e.target.value)}
                                    placeholder={fieldConfig.placeholder}
                                    required={fieldConfig.isRequired}
                                />
                            </div>
                        )}
                    </ConfiguredField>
                    <ConfiguredField sectionId={sectionId} fieldId="nome" formData={formData}>
                        {({ fieldConfig }) => (
                            <div className="space-y-2">
                                <Label htmlFor="nome">
                                    {fieldConfig.label}{fieldConfig.isRequired ? ' *' : ''}
                                </Label>
                                <Input
                                    id="nome"
                                    value={data.nome}
                                    onChange={(e) => onChange("nome", e.target.value)}
                                    placeholder={fieldConfig.placeholder}
                                    required={fieldConfig.isRequired}
                                />
                            </div>
                        )}
                    </ConfiguredField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ConfiguredField sectionId={sectionId} fieldId="sesso" formData={formData}>
                        {({ fieldConfig }) => (
                            <CreateCombobox
                                label={`${fieldConfig.label}${fieldConfig.isRequired ? ' *' : ''}`}
                                value={data.sesso}
                                onChange={(v) => onChange("sesso", v)}
                                options={fieldConfig.options}
                                placeholder={fieldConfig.placeholder}
                            />
                        )}
                    </ConfiguredField>
                    <ConfiguredField sectionId={sectionId} fieldId="dataDiNascita" formData={formData}>
                        {({ fieldConfig }) => (
                            <DatePicker
                                label={fieldConfig.label}
                                required={fieldConfig.isRequired}
                                value={data.dataDiNascita}
                                onChange={(date) => onChange("dataDiNascita", date)}
                            />
                        )}
                    </ConfiguredField>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ConfiguredField sectionId={sectionId} fieldId="cittadinanza" formData={formData}>
                        {({ fieldConfig }) => (
                            <CreateMultiCombobox
                                label={`${fieldConfig.label}${fieldConfig.isRequired ? ' *' : ''}`}
                                values={data.cittadinanza}
                                onChange={(val) => onChange("cittadinanza", val)}
                                options={Countries.map(c => c.name)}
                                placeholder={fieldConfig.placeholder}
                            />
                        )}
                    </ConfiguredField>
                    <ConfiguredField sectionId={sectionId} fieldId="luogoDiNascita" formData={formData}>
                        {({ fieldConfig }) => (
                            <CreateCombobox
                                label={`${fieldConfig.label}${fieldConfig.isRequired ? ' *' : ''}`}
                                value={data.luogoDiNascita}
                                onChange={(val) => onChange("luogoDiNascita", val)}
                                options={Countries.map(c => c.name)}
                                placeholder={fieldConfig.placeholder}
                            />
                        )}
                    </ConfiguredField>
                    <ConfiguredField sectionId={sectionId} fieldId="comuneDiDomicilio" formData={formData}>
                        {({ fieldConfig }) => (
                            <div className="space-y-2">
                                <Label htmlFor="comuneDiDomicilio">
                                    {fieldConfig.label}{fieldConfig.isRequired ? ' *' : ''}
                                </Label>
                                <Input
                                    id="comuneDiDomicilio"
                                    value={data.comuneDiDomicilio}
                                    onChange={(e) => onChange("comuneDiDomicilio", e.target.value)}
                                    placeholder={fieldConfig.placeholder}
                                    required={fieldConfig.isRequired}
                                />
                            </div>
                        )}
                    </ConfiguredField>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ConfiguredField sectionId={sectionId} fieldId="telefono" formData={formData}>
                        {({ fieldConfig }) => (
                            <div className="space-y-2">
                                <Label htmlFor="telefono">
                                    {fieldConfig.label}{fieldConfig.isRequired ? ' *' : ''}
                                </Label>
                                <Input
                                    id="telefono"
                                    value={data.telefono}
                                    onChange={(e) => onChange("telefono", e.target.value)}
                                    placeholder={fieldConfig.placeholder}
                                    required={fieldConfig.isRequired}
                                />
                            </div>
                        )}
                    </ConfiguredField>
                    <ConfiguredField sectionId={sectionId} fieldId="email" formData={formData}>
                        {({ fieldConfig }) => (
                            <div className="space-y-2">
                                <Label htmlFor="email">
                                    {fieldConfig.label}{fieldConfig.isRequired ? ' *' : ''}
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => onChange("email", e.target.value)}
                                    placeholder={fieldConfig.placeholder}
                                    required={fieldConfig.isRequired}
                                />
                            </div>
                        )}
                    </ConfiguredField>
                </div>
            </CardContent>
        </Card>
    );
}
