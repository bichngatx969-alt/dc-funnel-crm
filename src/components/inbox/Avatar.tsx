import { avatarGradient, initialsOf } from "./helpers";

const SIZES: Record<string, string> = {
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-lg",
};

const DOT_COLOR: Record<string, string> = {
  BOT_ACTIVE: "bg-sky-500",
  HUMAN_TAKEOVER: "bg-amber-500",
  CLOSED: "bg-gray-300",
};

export function Avatar({
  name,
  src,
  seed,
  size = "md",
  status,
  ring = false,
}: {
  name: string;
  src?: string | null;
  seed?: string;
  size?: "sm" | "md" | "lg";
  status?: string | null;
  ring?: boolean;
}) {
  const initials = initialsOf(name);
  const grad = avatarGradient(seed ?? name);
  return (
    <span className="relative inline-flex shrink-0">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className={`${SIZES[size]} rounded-full object-cover ${ring ? "ring-2 ring-white" : ""}`}
        />
      ) : (
        <span
          className={`${SIZES[size]} inline-flex items-center justify-center rounded-full bg-gradient-to-br ${grad} font-semibold text-white ${
            ring ? "ring-2 ring-white" : ""
          }`}
        >
          {initials}
        </span>
      )}
      {status && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
            DOT_COLOR[status] ?? "bg-gray-300"
          }`}
        />
      )}
    </span>
  );
}
