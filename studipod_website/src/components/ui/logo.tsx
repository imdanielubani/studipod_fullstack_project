import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import logo from "../../../public/logo/studipod-logo.png";

interface LogoProps {
  className?: string;
  /** Destination when clicked. Defaults to the top of the landing page. */
  href?: string;
  priority?: boolean;
  onNavigate?: () => void;
}

/** StudiPod wordmark. Uses the official logo artwork via next/image (auto AVIF/WebP). */
export function Logo({ className, href = "/#home", priority = false, onNavigate }: LogoProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-label={`${siteConfig.name} — home`}
      className={cn("inline-flex shrink-0 items-center rounded-md", className)}
    >
      <Image
        src={logo}
        alt=""
        priority={priority}
        sizes="(min-width: 768px) 140px, 120px"
        className="h-auto w-[120px] md:w-[140px]"
      />
    </Link>
  );
}
