"use client";

import { RotateCcw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/section-heading";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Route-level error boundary. Shows a generic message only — error details
 * and stack traces are never rendered to visitors (they remain in server logs).
 */
export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main id="main-content" className="grid min-h-dvh place-items-center py-24">
      <Container size="narrow" className="text-center">
        <Eyebrow>Something went wrong</Eyebrow>
        <h1 className="mt-6 text-headline font-semibold text-ink">We hit an unexpected problem.</h1>
        <p className="mx-auto mt-5 max-w-md text-lead text-ink-muted">
          Please try again. If the problem continues, come back a little later.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button onClick={reset} size="lg">
            <RotateCcw aria-hidden="true" className="size-4" />
            Try again
          </Button>
          <ButtonLink href="/" variant="secondary" size="lg">
            Back to home
          </ButtonLink>
        </div>
      </Container>
    </main>
  );
}
