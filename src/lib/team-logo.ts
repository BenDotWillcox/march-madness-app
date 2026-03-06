export function getTeamLogoPath(teamName: string) {
  return `/images/logos/${encodeURIComponent(teamName)}.png`;
}

export function getTeamLogoPlaceholderPath() {
  return "/images/logos/placeholder.png";
}
