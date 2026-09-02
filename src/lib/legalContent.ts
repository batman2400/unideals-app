export interface LegalSection {
  heading: string;
  body: string;
}

export const TERMS_UPDATED = "September 1, 2026";
export const PRIVACY_UPDATED = "September 1, 2026";
export const DELETE_ACCOUNT_URL = "https://www.unideals.co/delete-account";

export const TERMS_SECTIONS: readonly LegalSection[] = [
  {
    heading: "1. Agreement and Scope",
    body: "These Terms of Service govern your access to and use of Uni Deals, a software platform that connects verified students with promotions published by third-party merchants and institutional partners in Sri Lanka. By creating an account, browsing deals, or using any Uni Deals website or app feature, you agree to these Terms.",
  },
  {
    heading: "2. Eligibility and Accounts",
    body: "You must be at least 13 years old. Uni Deals is not designed for children under 13. You must provide accurate account information and maintain the security of your login credentials. Student eligibility requires verification of enrolment (university email and/or student ID). Verified student status is valid for 12 months from approval and must be renewed each year to keep unlocking partner offers. Uni Deals uses role-based access controls, including student, partner, and administrator roles, to protect platform integrity and ensure users only access permitted features.",
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
    heading: "5. Device Permissions",
    body: "Partners who redeem in-store offers may be asked for camera access so the scanner can read student QR tickets on the device. Students who use the Uni Deals mobile app may be asked for notification permission so we can send optional deal or event alerts. You can refuse or revoke those permissions in your device settings; some partner or app features will not work without them.",
  },
  {
    heading: "6. Privacy and Data Protection",
    body: "Uni Deals applies reasonable technical and organizational safeguards for personal data, including account authentication, email verification checks, and role-based authorization. Student ID photos are stored privately and shown to reviewers through short-lived signed URLs. Our data handling practices are described in the Privacy Policy and align with applicable Sri Lankan data protection obligations, including the Personal Data Protection Act, where applicable.",
  },
  {
    heading: "7. Account Deletion",
    body: `You may delete your account at any time from Profile in the app, or at ${DELETE_ACCOUNT_URL}. Deletion is permanent. It removes your login and associated personal records as described in the Privacy Policy. Offers you already redeemed with a partner remain subject to that partner's own terms.`,
  },
  {
    heading: "8. Intellectual Property",
    body: "Uni Deals branding, software, and platform content are protected by intellectual property laws. Partner logos, brand assets, and offer content remain the property of their respective owners and are displayed under applicable permissions.",
  },
  {
    heading: "9. Service Availability and Changes",
    body: "We may update, suspend, or discontinue features to improve reliability, security, or legal compliance. We do not guarantee uninterrupted access at all times, and maintenance or third-party dependencies may affect availability.",
  },
  {
    heading: "10. Disclaimers and Liability Limits",
    body: 'The platform is provided on an "as is" and "as available" basis. To the extent permitted by law, Uni Deals is not liable for indirect, incidental, or consequential losses arising from partner actions, offer changes, delays, or service interruptions.',
  },
  {
    heading: "11. Governing Law",
    body: "These Terms are governed by the laws of Sri Lanka. Any dispute relating to the platform will be subject to the applicable courts and legal procedures of Sri Lanka, unless otherwise required by law.",
  },
  {
    heading: "12. Contact",
    body: "For legal, compliance, or account concerns, contact the Uni Deals team at unideals.lk@gmail.com.",
  },
];

export const PRIVACY_SECTIONS: readonly LegalSection[] = [
  {
    heading: "1. Who We Are",
    body: "Uni Deals is a student discount platform serving universities and partner businesses in Sri Lanka. This Privacy Policy explains how we collect, use, protect, and disclose personal information when you use our website, mobile app, and related services.",
  },
  {
    heading: "2. Age Requirement",
    body: "Uni Deals is not designed for children under 13. You must be at least 13 years old to create an account or use the service. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has created an account, contact us at unideals.lk@gmail.com and we will delete it.",
  },
  {
    heading: "3. Information We Collect",
    body: "We may collect account and profile data such as name, email address, user role, university-related verification details, usage events, and saved deal interactions. Partner and admin users may also provide business and offer-management details relevant to campaign publishing.\n\nIf you verify with a student ID, we collect photos of that document (front and, when requested, back). If you use the Uni Deals mobile app and enable notifications, we store a device push token so we can send the alerts you chose. We do not collect payment card details on Uni Deals.",
  },
  {
    heading: "4. How We Use Your Data",
    body: "We use data to authenticate accounts, support student verification, assign and enforce role-based permissions, deliver relevant deals, prevent fraud, respond to support requests, send optional app notifications you enable, and improve service reliability and user experience.",
  },
  {
    heading: "5. Student ID Documents",
    body: "ID photos are stored in a private storage bucket. They are not public files. When an admin reviews a request, they open the images through short-lived signed URLs that expire after about five minutes. We retain ID documents only as long as needed to complete verification, prevent duplicate or fraudulent enrolments, and meet legal obligations, then we delete them with your account or earlier when they are no longer required.",
  },
  {
    heading: "6. Camera and Push Notifications",
    body: "Partner and admin users who scan in-store tickets may grant camera access on the partner scanner. Camera frames are processed on the device to read QR codes. We do not upload a live video stream of the scan.\n\nThe mobile app may store Expo push tokens on your account so we can send optional deal or event alerts. You can disable notifications in the device settings. Tokens are removed when you delete your account.",
  },
  {
    heading: "7. Verification, Security, and Access Control",
    body: "Uni Deals uses safeguards such as authenticated sessions, role-based authorization, controlled data access paths, and verification checks to reduce unauthorized access. While no system can be guaranteed 100% secure, we apply industry-standard measures to protect data in transit and at rest through our infrastructure providers.",
  },
  {
    heading: "8. Third-Party Partners and Service Providers",
    body: "Deals shown on Uni Deals are provided by third-party partners. We may share only the minimum necessary information with trusted service providers and infrastructure vendors for hosting, authentication, analytics, and communications. Partner businesses are independently responsible for how they handle transactions and redemptions under their own policies.",
  },
  {
    heading: "9. Data Retention",
    body: "We retain personal data only for as long as needed to provide the service, meet legal and compliance obligations, resolve disputes, and enforce platform terms. Retention periods may vary by data type and operational necessity. When you delete your account we remove the records described in Your Rights below.",
  },
  {
    heading: "10. Cookies and Similar Technologies",
    body: "We may use cookies or similar technologies for login persistence, security, and analytics. On the live website we use Google Analytics 4 and Microsoft Clarity to understand how pages are used; Clarity session recordings mask typed input, including student emails and registration IDs. You can manage browser preferences, but disabling certain cookies may affect platform functionality.",
  },
  {
    heading: "11. Your Rights",
    body: `Subject to applicable law, including the Sri Lankan Personal Data Protection Act where applicable, you may request access or correction of your personal information. You can delete your Uni Deals account yourself at any time from Profile in the app, or at ${DELETE_ACCOUNT_URL}. You do not need to email support to close an account. After you confirm, we remove your login, role, ID documents, related tickets, and app push tokens, then sign you out.\n\nFor other privacy questions, contact unideals.lk@gmail.com.`,
  },
  {
    heading: "12. International Transfers",
    body: "Our technology providers may process data in multiple jurisdictions. Where cross-border transfer occurs, we apply appropriate safeguards and contractual protections consistent with applicable legal requirements.",
  },
  {
    heading: "13. Contact",
    body: "For privacy questions or requests, contact: unideals.lk@gmail.com.",
  },
];
