import { LegalDocument } from "@/components/LegalDocument";
import { TERMS_SECTIONS, TERMS_UPDATED } from "@/lib/legalContent";

export default function TermsScreen() {
  return (
    <LegalDocument
      title="Terms of Service"
      updated={TERMS_UPDATED}
      sections={TERMS_SECTIONS}
    />
  );
}
