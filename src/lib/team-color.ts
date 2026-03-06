export const TEAM_COLOR_HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function normalizeTeamColor(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!TEAM_COLOR_HEX_PATTERN.test(withHash)) {
    return undefined;
  }

  return withHash.toUpperCase();
}
