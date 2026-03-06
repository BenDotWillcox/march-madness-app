import { getTeamLogoPath, getTeamLogoPlaceholderPath } from "@/lib/team-logo";

type TeamNameWithLogoProps = {
  teamName: string;
  className?: string;
  logoSize?: number;
};

export function TeamNameWithLogo({
  teamName,
  className,
  logoSize = 20,
}: TeamNameWithLogoProps) {
  return (
    <span className={["inline-flex items-center gap-2", className].filter(Boolean).join(" ")}>
      <img
        src={getTeamLogoPath(teamName)}
        alt={`${teamName} logo`}
        width={logoSize}
        height={logoSize}
        className="shrink-0 object-contain"
        loading="lazy"
        onError={(event) => {
          const image = event.currentTarget;
          image.onerror = null;
          image.src = getTeamLogoPlaceholderPath();
        }}
      />
      <span>{teamName}</span>
    </span>
  );
}
