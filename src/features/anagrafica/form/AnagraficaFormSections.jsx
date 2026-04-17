"use client";

import FamilyUnitSection from "@/components/Anagrafica/Form/FamilyUnitSection";
import LegalStatusSection from "@/components/Anagrafica/Form/LegalStatusSection";
import PersonalInfoSection from "@/components/Anagrafica/Form/PersonalInfoSection";
import PrivacyComplianceSection from "@/components/Anagrafica/Form/PrivacyComplianceSection";
import ReferralSection from "@/components/Anagrafica/Form/ReferralSection";
import VulnerabilitySection from "@/components/Anagrafica/Form/VulnerabilitySection";
import WorkEducationSection from "@/components/Anagrafica/Form/WorkEducationSection";

const CORE_FORM_SECTIONS = [
  {
    key: "personal-info",
    Component: PersonalInfoSection,
  },
  {
    key: "legal-status",
    Component: LegalStatusSection,
  },
  {
    key: "family-unit",
    Component: FamilyUnitSection,
  },
  {
    key: "work-education",
    Component: WorkEducationSection,
  },
  {
    key: "vulnerability",
    Component: VulnerabilitySection,
  },
  {
    key: "referral",
    Component: ReferralSection,
  },
];

export default function AnagraficaFormSections({
  formData,
  handleChange,
  includePrivacy = false,
  itemClassName = "",
}) {
  const sections = [...CORE_FORM_SECTIONS];

  if (includePrivacy) {
    sections.push({
      key: "privacy",
      Component: PrivacyComplianceSection,
    });
  }

  return sections.map(({ key, Component }) => (
    <div key={key} className={itemClassName || undefined}>
      <Component formData={formData} handleChange={handleChange} />
    </div>
  ));
}
