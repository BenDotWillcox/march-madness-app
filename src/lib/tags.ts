import type { TeamTag, TeamTagType } from "@/lib/schema/team";

const TEAM_TAG_TYPES = new Set<TeamTagType>(["strength", "weakness"]);

function normalizeTagType(value: unknown): TeamTagType | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return TEAM_TAG_TYPES.has(normalized as TeamTagType) ? (normalized as TeamTagType) : null;
}

function normalizeTagLabel(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeTeamTag(value: unknown): TeamTag | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    // Handle legacy rows where JSON tags were persisted as strings.
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        const normalized = normalizeTeamTag(parsed);
        if (normalized) {
          return normalized;
        }
      } catch {
        // Fall through to plain label handling.
      }
    }

    return { label: trimmed, type: "strength" };
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as { label?: unknown; type?: unknown };
  const label = normalizeTagLabel(candidate.label);
  const type = normalizeTagType(candidate.type);

  if (!label) {
    return null;
  }

  return {
    label,
    type: type ?? "strength",
  };
}

export function normalizeTeamTags(values: unknown): TeamTag[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const dedupe = new Set<string>();
  const normalizedTags: TeamTag[] = [];

  for (const value of values) {
    const normalized = normalizeTeamTag(value);
    if (!normalized) {
      continue;
    }

    const dedupeKey = `${normalized.type}:${normalized.label.toLowerCase()}`;
    if (dedupe.has(dedupeKey)) {
      continue;
    }

    dedupe.add(dedupeKey);
    normalizedTags.push(normalized);
  }

  return normalizedTags;
}

export function parseTeamTagsFromEditor(input: string): TeamTag[] {
  const tags = input
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token): TeamTag | null => {
      if (/^(weakness|w)\s*:/i.test(token)) {
        const label = token.replace(/^(weakness|w)\s*:/i, "").trim();
        return label ? { label, type: "weakness" } : null;
      }

      if (/^(strength|s)\s*:/i.test(token)) {
        const label = token.replace(/^(strength|s)\s*:/i, "").trim();
        return label ? { label, type: "strength" } : null;
      }

      return { label: token, type: "strength" };
    })
    .filter((tag): tag is TeamTag => Boolean(tag));

  return normalizeTeamTags(tags);
}

export function serializeTeamTagsForEditor(tags: TeamTag[]): string {
  return tags
    .map((tag) => (tag.type === "weakness" ? `weakness: ${tag.label}` : tag.label))
    .join(", ");
}

export function teamTagBadgeClass(tag: TeamTag): string {
  if (tag.type === "strength") {
    return "border-emerald-300 bg-emerald-100 text-emerald-900";
  }

  return "border-red-300 bg-red-100 text-red-900";
}
