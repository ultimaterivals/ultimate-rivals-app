import { clsx } from "clsx";

const sizeClass = {
  sm: "size-10 text-sm",
  md: "size-14 text-base",
  lg: "size-24 text-2xl",
  xl: "size-32 text-4xl",
} as const;

export interface AthleteAvatarProps {
  publicName: string;
  imageUrl?: string | null;
  size?: keyof typeof sizeClass;
  priority?: boolean;
  className?: string;
}

function initials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return (parts.map((part) => part[0]).join("") || "UR").toUpperCase();
}

export function AthleteAvatar({
  publicName,
  imageUrl,
  size = "md",
  priority = false,
  className,
}: AthleteAvatarProps) {
  return (
    <div
      className={clsx(
        "relative shrink-0 overflow-hidden rounded-full border border-ur-gold/50 bg-gradient-to-br from-zinc-900 via-black to-ur-panel shadow-[0_0_0_1px_rgba(244,196,48,.12)]",
        sizeClass[size],
        className,
      )}
      aria-label={`Avatar de ${publicName}`}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          loading={priority ? "eager" : "lazy"}
          className="h-full w-full object-cover"
          width={size === "xl" ? 128 : size === "lg" ? 96 : 56}
          height={size === "xl" ? 128 : size === "lg" ? 96 : 56}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="font-display text-ur-gold font-black tracking-wider">
            {initials(publicName)}
          </span>
          <span className="absolute right-1 bottom-1 rounded-full bg-ur-gold px-1 text-[.45em] font-black text-black">
            UR
          </span>
        </div>
      )}
    </div>
  );
}
