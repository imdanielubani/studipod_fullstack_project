import Image from "next/image";
import type { CSSProperties } from "react";
import heroImage from "../../../public/images/hero.jpeg";

const ENTRANCE_STYLE: CSSProperties = { animationDelay: "520ms" };

/** Matches the rendered width: page gutters plus the frame padding at each breakpoint. */
const IMAGE_SIZES =
  "(min-width: 1280px) 1192px, (min-width: 1024px) calc(100vw - 88px), (min-width: 640px) calc(100vw - 68px), calc(100vw - 52px)";

/** Above the default so the small interface text in the capture stays crisp. */
const IMAGE_QUALITY = 90;

/**
 * Hero product image: a live StudiPod study session in a brand-navy frame.
 * The inner corner radius is kept small enough at every breakpoint that it never
 * cuts into the session controls at the edges of the capture.
 */
export function HeroVisual() {
  return (
    <div className="relative animate-rise" style={ENTRANCE_STYLE}>
      <div
        aria-hidden="true"
        className="absolute inset-x-[8%] -bottom-6 h-1/2 rounded-full bg-brand-600/25 blur-3xl"
      />
      <div className="relative rounded-[14px] bg-brand-950 p-1.5 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.14),0_40px_80px_-32px_rgb(23_37_84/0.55)] ring-1 ring-brand-950/10 sm:rounded-lg sm:p-2.5 lg:rounded-xl lg:p-3">
        <Image
          src={heroImage}
          alt="Four medical learners on a live StudiPod video call during a cardiology board review session."
          preload
          placeholder="blur"
          quality={IMAGE_QUALITY}
          sizes={IMAGE_SIZES}
          className="h-auto w-full rounded-[8px] sm:rounded-[14px] lg:rounded-[20px]"
        />
      </div>
    </div>
  );
}
