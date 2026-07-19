import { AppShell } from "@/components/layout/AppShell";
import { LegalPageContent } from "@/components/legal/LegalPageContent";

const SECTIONS = [
  {
    title: "Overview",
    body: [
      "FeyseFit respects your privacy. This policy explains what information we collect, how we use it, and the choices you have.",
      "We collect only what is needed to operate a secure bespoke fashion collaboration platform.",
    ],
  },
  {
    title: "Information we collect",
    body: [
      "Account data such as your name, email address, role, and profile details you choose to provide.",
      "Project and messaging data created while coordinating commissions, including measurements, references, and status updates.",
      "Technical data such as session information required to keep you signed in securely.",
    ],
  },
  {
    title: "How we use information",
    body: [
      "To authenticate you, personalize your dashboard, and connect clients with their designers.",
      "To deliver notifications you opt into, such as project updates and account alerts.",
      "To maintain platform safety, investigate abuse reports, and improve product reliability.",
    ],
  },
  {
    title: "Sharing",
    body: [
      "Designers and clients involved in a project can see information relevant to that commission, such as messages, measurements, and project details.",
      "We do not sell personal information. We may share data with infrastructure providers that help us host the service under strict confidentiality obligations.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "You can update profile and notification preferences in Settings.",
      "You may request account deletion or data export by contacting support through the app.",
      "Marketing email and push preferences can be toggled off at any time in Settings.",
    ],
  },
  {
    title: "Security",
    body: [
      "We use industry-standard authentication and access controls. No method of transmission over the internet is completely secure, but we work continuously to protect your data.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <AppShell>
      <LegalPageContent
        title="Privacy Policy"
        subtitle="How FeyseFit collects, uses, and protects your personal information."
        lastUpdated="5 July 2026"
        sections={SECTIONS}
      />
    </AppShell>
  );
}
