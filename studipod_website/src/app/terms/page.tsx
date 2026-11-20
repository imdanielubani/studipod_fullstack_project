import type { Metadata } from "next";
import { LegalPage, PlaceholderNotice } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "StudiPod Terms of Use.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use">
      <PlaceholderNotice>
        The StudiPod Terms of Use are being prepared and will be published on this page once they
        have been reviewed and approved. This page does not yet constitute terms of use.
      </PlaceholderNotice>
    </LegalPage>
  );
}
