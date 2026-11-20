import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { Eyebrow } from "@/components/ui/section-heading";

interface LegalPageProps {
  title: string;
  children: ReactNode;
}

/** Shared shell for legal routes (Privacy Policy, Terms of Use). */
export function LegalPage({ title, children }: LegalPageProps) {
  return (
    <>
      <header className="border-b border-line bg-surface">
        <Container size="wide" className="flex h-20 items-center justify-between">
          <Logo href="/" />
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-brand-950/5 hover:text-ink"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to home
          </Link>
        </Container>
      </header>
      <main id="main-content" tabIndex={-1} className="outline-none">
        <Container size="narrow" className="py-20 md:py-28">
          <Eyebrow>Legal</Eyebrow>
          <h1 className="mt-6 text-headline font-semibold text-ink">{title}</h1>
          <div className="mt-10 space-y-5 text-lead text-ink-muted">{children}</div>
        </Container>
      </main>
      <Footer />
    </>
  );
}

/** Prominent notice that the legal text is a placeholder awaiting approved content. */
export function PlaceholderNotice({ children }: { children: ReactNode }) {
  return (
    <div
      role="note"
      className="rounded-lg border border-accent-300/60 bg-accent-100/40 p-6 text-base text-ink"
    >
      <p className="font-semibold">Placeholder — awaiting approved content</p>
      <p className="mt-2 text-ink-muted">{children}</p>
    </div>
  );
}
