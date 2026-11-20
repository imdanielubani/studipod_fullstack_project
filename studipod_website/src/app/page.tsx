import { Navbar } from "@/components/layout/navbar";
import { BigIdeaSection } from "@/components/sections/big-idea-section";
import { HeroSection } from "@/components/sections/hero-section";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="outline-none">
        <HeroSection />
        <BigIdeaSection />
      </main>
    </>
  );
}
