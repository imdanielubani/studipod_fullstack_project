import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { SectionHeading } from "@/components/ui/section-heading";

export default function HomePage() {
  return (
    <main id="home" className="py-24">
      <Container className="flex flex-col gap-10">
        <Logo priority />
        <SectionHeading eyebrow="StudiPod" title="The Study Experience, Reimagined" />
        <ButtonLink href="#waitlist">Join the Waitlist</ButtonLink>
      </Container>
    </main>
  );
}
