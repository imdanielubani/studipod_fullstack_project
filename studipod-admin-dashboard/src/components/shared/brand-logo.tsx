import Image from 'next/image';

import { APP_CONFIG } from '@/config/app';
import { cn } from '@/lib/utils';

/** StudiPod wordmark, reverse variant for brand-dark surfaces. */
export function BrandLogo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logos/studipod-logo-reverse.png"
      alt={APP_CONFIG.productName}
      width={1470}
      height={261}
      priority={priority}
      className={cn('h-auto', className)}
    />
  );
}

/** Icon-only mark (the "i" with the play flag) on a brand-dark tile. */
export function AppIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn('grid size-10 shrink-0 place-items-center rounded-lg bg-brand-dark', className)}
    >
      <Image
        src="/logos/studipod-mark.png"
        alt=""
        aria-hidden
        width={70}
        height={256}
        className="h-[26px] w-auto"
      />
    </span>
  );
}
