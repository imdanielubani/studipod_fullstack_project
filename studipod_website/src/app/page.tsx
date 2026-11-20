import { Navbar } from "@/components/layout/navbar";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="outline-none">
        <section id="home" className="pt-40 pb-24">
          <Container className="flex flex-col gap-10">
            <SectionHeading eyebrow="StudiPod" title="The Study Experience, Reimagined" />
            <ButtonLink href="#waitlist">Join the Waitlist</ButtonLink>
          </Container>
        </section>
      </main>
    </>
  );
}
