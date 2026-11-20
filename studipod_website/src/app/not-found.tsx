import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { Eyebrow } from "@/components/ui/section-heading";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main id="main-content" className="relative isolate grid min-h-dvh place-items-center py-24">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-dot-grid mask-radial opacity-60"
      />
      <Container size="narrow" className="flex flex-col items-center text-center">
        <Logo href="/" />
        <Eyebrow className="mt-12">404</Eyebrow>
        <h1 className="mt-6 text-headline font-semibold text-ink">
          This page{" "}
          <span className="font-serif font-normal tracking-[-0.02em] text-brand-600 italic">
            wandered off.
          </span>
        </h1>
        <p className="mt-5 max-w-md text-lead text-ink-muted">
          The page you were looking for doesn&rsquo;t exist or may have moved.
        </p>
        <ButtonLink href="/" size="lg" className="mt-10">
          Back to home
        </ButtonLink>
      </Container>
    </main>
  );
}
