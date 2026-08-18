import { LegalDocument } from "@/components/LegalDocument";
import { PRIVACY_SECTIONS, PRIVACY_UPDATED } from "@/lib/legalContent";

export default function PrivacyScreen() {
  return (
    <LegalDocument
      title="Privacy Policy"
      updated={PRIVACY_UPDATED}
      sections={PRIVACY_SECTIONS}
    />
  );
}
