import type { Metadata } from "next";
import { LegalPage, PlaceholderNotice } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "StudiPod Privacy Policy.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <PlaceholderNotice>
        The StudiPod Privacy Policy is being prepared and will be published on this page once it has
        been reviewed and approved. This page does not yet constitute a privacy policy.
      </PlaceholderNotice>
      <p>
        For reference while the policy is finalised: the early-access waitlist form asks for your
        full name, your email address and, optionally, your examination or professional category.
      </p>
    </LegalPage>
  );
}
