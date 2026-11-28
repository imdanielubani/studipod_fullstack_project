import { cn } from '@/lib/utils';

type AvatarProps = {
  initials: string;
  size?: 'md' | 'lg';
  className?: string;
};

const sizes = {
  md: 'size-8 text-caption',
  lg: 'size-10 text-body-md',
} as const;

/** Initials avatar. Admin views never show photos. Decorative: pair it with the name. */
export function Avatar({ initials, size = 'md', className }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-full border-2 border-surface bg-brand-soft font-medium text-link select-none',
        sizes[size],
        className,
      )}
    >
      {initials}
    </span>
  );
}

/** Up to two initials from a first and last name. */
export function initialsFromName(firstName: string, lastName: string): string {
  const initials = `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`;
  return initials.toUpperCase() || '?';
}
