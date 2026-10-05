type Props = {
  name: string;
  logoUrl?: string | null;
  className?: string;
};

export function ProviderLogo({
  name,
  logoUrl,
  className = "",
}: Props) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) =>
      part.charAt(0),
    )
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={[
        "grid h-11 w-11 shrink-0 place-items-center overflow-hidden",
        "rounded-[12px] border border-[#e7e9ee] bg-white",
        className,
      ].join(" ")}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${name} logo`}
          className="h-full w-full object-contain p-1.5"
          loading="lazy"
        />
      ) : (
        <span className="text-[12px] font-[750] text-[#475467]">
          {initials}
        </span>
      )}
    </div>
  );
}