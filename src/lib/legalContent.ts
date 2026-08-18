export interface LegalSection {
  heading: string;
  body: string;
}

export const TERMS_UPDATED = "April 20, 2026";
export const PRIVACY_UPDATED = "April 20, 2026";

export const TERMS_SECTIONS: readonly LegalSection[] = [
  {
    heading: "1. Agreement and Scope",
    body: "These Terms of Service govern your access to and use of Uni Deals, a software platform that connects verified students with promotions published by third-party merchants and institutional partners in Sri Lanka. By creating an account, browsing deals, or using any Uni Deals feature, you agree to these Terms.",
  },
  {
    heading: "2. Eligibility and Accounts",
    body: "You must provide accurate account information and maintain the security of your login credentials. Student eligibility may require university email verification. Uni Deals uses role-based access controls, including student, partner, and administrator roles, to protect platform integrity and ensure users only access permitted features.",
  },
  {
    heading: "3. Partner-Provided Offers",
    body: "Discounts, redemption terms, inventory, and fulfillment are provided and managed by third-party partners. Uni Deals acts as a discovery and access layer and does not own, manufacture, or fulfill partner products and services. Partners remain responsible for the accuracy, legality, availability, and execution of their offers.",
  },
  {
    heading: "4. Acceptable Use",
    body: "You agree not to abuse the platform, attempt unauthorized access, scrape private data, share restricted redemption codes, impersonate another user, or interfere with platform security controls. We may suspend or terminate accounts involved in fraud, abuse, or any activity that risks students, partners, or platform stability.",
  },
  {
    heading: "5. Privacy and Data Protection",
    body: "Uni Deals applies reasonable technical and organizational safeguards for personal data, including account authentication, email verification checks, and role-based authorization. Our data handling practices are described in the Privacy Policy and align with applicable Sri Lankan data protection obligations, including the Personal Data Protection Act, where applicable.",
  },
  {
    heading: "6. Intellectual Property",
    body: "Uni Deals branding, software, and platform content are protected by intellectual property laws. Partner logos, brand assets, and offer content remain the property of their respective owners and are displayed under applicable permissions.",
  },
  {
    heading: "7. Service Availability and Changes",
    body: "We may update, suspend, or discontinue features to improve reliability, security, or legal compliance. We do not guarantee uninterrupted access at all times, and maintenance or third-party dependencies may affect availability.",
  },
  {
    heading: "8. Disclaimers and Liability Limits",
    body: 'The platform is provided on an "as is" and "as available" basis. To the extent permitted by law, Uni Deals is not liable for indirect, incidental, or consequential losses arising from partner actions, offer changes, delays, or service interruptions.',
  },
  {
    heading: "9. Governing Law",
    body: "These Terms are governed by the laws of Sri Lanka. Any dispute relating to the platform will be subject to the applicable courts and legal procedures of Sri Lanka, unless otherwise required by law.",
  },
  {
    heading: "10. Contact",
    body: "For legal, compliance, or account concerns, contact the Uni Deals team at unideals.lk@gmail.com.",
  },
];

export const PRIVACY_SECTIONS: readonly LegalSection[] = [
  {
    heading: "1. Who We Are",
    body: "Uni Deals is a student discount platform serving universities and partner businesses in Sri Lanka. This Privacy Policy explains how we collect, use, protect, and disclose personal information when you use our website and services.",
  },
  {
    heading: "2. Information We Collect",
    body: "We may collect account and profile data such as name, email address, user role, university-related verification details, usage events, and saved deal interactions. Partner and admin users may also provide business and offer-management details relevant to campaign publishing.",
  },
  {
    heading: "3. How We Use Your Data",
    body: "We use data to authenticate accounts, support student email verification flows, assign and enforce role-based permissions, deliver relevant deals, prevent fraud, respond to support requests, and improve service reliability and user experience.",
  },
  {
    heading: "4. Verification, Security, and Access Control",
    body: "Uni Deals uses safeguards such as authenticated sessions, role-based authorization, controlled data access paths, and verification checks to reduce unauthorized access. While no system can be guaranteed 100% secure, we apply industry-standard measures to protect data in transit and at rest through our infrastructure providers.",
  },
  {
    heading: "5. Third-Party Partners and Service Providers",
    body: "Deals shown on Uni Deals are provided by third-party partners. We may share only the minimum necessary information with trusted service providers and infrastructure vendors for hosting, authentication, analytics, and communications. Partner businesses are independently responsible for how they handle transactions and redemptions under their own policies.",
  },
  {
    heading: "6. Data Retention",
    body: "We retain personal data only for as long as needed to provide the service, meet legal and compliance obligations, resolve disputes, and enforce platform terms. Retention periods may vary by data type and operational necessity.",
  },
  {
    heading: "7. Cookies and Similar Technologies",
    body: "We may use cookies or similar technologies for login persistence, security, and analytics. You can manage browser preferences, but disabling certain cookies may affect platform functionality.",
  },
  {
    heading: "8. Your Rights",
    body: "Subject to applicable law, including the Sri Lankan Personal Data Protection Act where applicable, you may request access, correction, or deletion of your personal information. You may also request account closure by contacting support.",
  },
  {
    heading: "9. International Transfers",
    body: "Our technology providers may process data in multiple jurisdictions. Where cross-border transfer occurs, we apply appropriate safeguards and contractual protections consistent with applicable legal requirements.",
  },
  {
    heading: "10. Contact",
    body: "For privacy questions or requests, contact: unideals.lk@gmail.com.",
  },
];
