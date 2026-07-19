import { AppShell } from "@/components/layout/AppShell";
import { LegalPageContent } from "@/components/legal/LegalPageContent";

const SECTIONS = [
  {
    title: "Acceptance",
    body: [
      "By creating a FeyseFit account or using our platform, you agree to these Terms of Service. If you do not agree, please do not use the service.",
      "We may update these terms from time to time. Continued use after changes constitutes acceptance of the revised terms.",
    ],
  },
  {
    title: "Platform use",
    body: [
      "FeyseFit connects clients with independent fashion designers for bespoke commissions. Designers are responsible for their own client relationships, pricing, and delivery commitments made through the platform.",
      "You agree to provide accurate profile information, communicate respectfully, and use the platform only for lawful fashion commission and collaboration purposes.",
    ],
  },
  {
    title: "Accounts & access",
    body: [
      "You are responsible for safeguarding your login credentials. Notify us promptly if you suspect unauthorized access to your account.",
      "We may suspend or terminate accounts that violate these terms, abuse other members, or compromise platform security.",
    ],
  },
  {
    title: "Content & intellectual property",
    body: [
      "You retain ownership of designs, images, and messages you upload. You grant FeyseFit a limited license to host and display that content solely to operate the service.",
      "Do not upload content you do not have rights to use, including copyrighted reference imagery without permission.",
    ],
  },
  {
    title: "Limitation of liability",
    body: [
      "FeyseFit provides tooling for discovery, messaging, and project coordination. We are not a party to commission contracts between clients and designers.",
      "To the fullest extent permitted by law, FeyseFit is not liable for indirect or consequential damages arising from use of the platform.",
    ],
  },
];

export default function TermsPage() {
  return (
    <AppShell>
      <LegalPageContent
        title="Terms of Service"
        subtitle="The rules that govern your use of the FeyseFit atelier platform."
        lastUpdated="5 July 2026"
        sections={SECTIONS}
      />
    </AppShell>
  );
}
