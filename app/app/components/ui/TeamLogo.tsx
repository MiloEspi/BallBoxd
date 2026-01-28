'use client';

type TeamLogoProps = {
  name: string;
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  imgClassName?: string;
};

const sizeClasses: Record<NonNullable<TeamLogoProps['size']>, string> = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-12 w-12',
};

const imgSizeClasses: Record<NonNullable<TeamLogoProps['size']>, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-7 w-7',
  xl: 'h-8 w-8',
};

const getInitials = (value: string) =>
  value
    .split(' ')
    .map((word) => word[0])
    .slice(0, 3)
    .join('')
    .toUpperCase();

export default function TeamLogo({
  name,
  logoUrl,
  size = 'md',
  className,
  imgClassName,
}: TeamLogoProps) {
  return (
    <span
      className={[
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-slate-900/70 text-xs font-semibold uppercase text-slate-200',
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          className={[
            'block object-contain',
            imgSizeClasses[size],
            imgClassName,
          ]
            .filter(Boolean)
            .join(' ')}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </span>
  );
}
