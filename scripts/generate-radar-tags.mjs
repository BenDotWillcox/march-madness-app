import { createClient } from "@supabase/supabase-js";

// Toggle to wipe existing tags before generating new ones.
const DELETE_EXISTING_TAGS = true;

const STRENGTH_COUNT = 3;
const WEAKNESS_COUNT = 3;

const RADAR_METRICS = [
  { key: "twoFgPct", label: "2FG%", higherIsBetter: true },
  { key: "threeFgPct", label: "3FG%", higherIsBetter: true },
  { key: "ftPct", label: "FT%", higherIsBetter: true },
  { key: "eFgPct", label: "eFG%", higherIsBetter: true },
  { key: "ftRate", label: "FTRate", higherIsBetter: true },
  { key: "threePRate", label: "3PRate", higherIsBetter: true },
  { key: "ftRateD", label: "FTRateD", higherIsBetter: false },
  { key: "threePRateD", label: "3PRateD", higherIsBetter: false },
  { key: "eFgPctD", label: "eFG%D", higherIsBetter: false },
  { key: "twoFgPctD", label: "2FG%D", higherIsBetter: false },
  { key: "threeFgPctD", label: "3FG%D", higherIsBetter: false },
  { key: "aRateD", label: "ARateD", higherIsBetter: false },
  { key: "orPct", label: "OR%", higherIsBetter: true },
  { key: "drPct", label: "DR%", higherIsBetter: false },
  { key: "toPct", label: "TO%", higherIsBetter: false },
  { key: "toPctD", label: "TO%D", higherIsBetter: true },
  { key: "aRate", label: "ARate", higherIsBetter: true },
];

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const radarLabelSet = new Set(RADAR_METRICS.map((metric) => metric.label.toLowerCase()));

function normalizeTag(value) {
  if (typeof value === "string") {
    const label = value.trim();
    if (!label) {
      return null;
    }
    return { label, type: "strength" };
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value;
  const label = typeof candidate.label === "string" ? candidate.label.trim() : "";
  const type = typeof candidate.type === "string" ? candidate.type.trim().toLowerCase() : "";
  if (!label) {
    return null;
  }

  return {
    label,
    type: type === "weakness" ? "weakness" : "strength",
  };
}

function dedupeTags(tags) {
  const seen = new Set();
  const deduped = [];

  for (const tag of tags) {
    const normalized = normalizeTag(tag);
    if (!normalized) {
      continue;
    }

    const key = `${normalized.type}:${normalized.label.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(normalized);
  }

  return deduped;
}

function isGeneratedRadarTag(tag) {
  return (
    (tag.type === "strength" || tag.type === "weakness") &&
    radarLabelSet.has(tag.label.toLowerCase())
  );
}

function buildRankMap(teams) {
  const ranksByTeamId = new Map();

  for (const metric of RADAR_METRICS) {
    const ranked = teams
      .map((team) => {
        const value = team.predictive_metrics?.[metric.key];
        return {
          teamId: team.id,
          value: typeof value === "number" && Number.isFinite(value) ? value : null,
        };
      })
      .filter((entry) => entry.value !== null)
      .sort((a, b) => {
        if (metric.higherIsBetter) {
          return b.value - a.value;
        }
        return a.value - b.value;
      });

    ranked.forEach((entry, index) => {
      if (!ranksByTeamId.has(entry.teamId)) {
        ranksByTeamId.set(entry.teamId, []);
      }

      ranksByTeamId.get(entry.teamId).push({
        metricKey: metric.key,
        label: metric.label,
        rank: index + 1,
      });
    });
  }

  return ranksByTeamId;
}

function generateTeamTags(teamId, ranksByTeamId) {
  const entries = ranksByTeamId.get(teamId) ?? [];
  if (entries.length === 0) {
    return [];
  }

  const best = [...entries]
    .sort((a, b) => a.rank - b.rank)
    .slice(0, STRENGTH_COUNT)
    .map((entry) => ({ label: entry.label, type: "strength" }));

  const bestLabels = new Set(best.map((entry) => entry.label));
  const worst = [...entries]
    .filter((entry) => !bestLabels.has(entry.label))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, WEAKNESS_COUNT)
    .map((entry) => ({ label: entry.label, type: "weakness" }));

  return dedupeTags([...best, ...worst]);
}

const { data: teams, error: readError } = await supabase
  .from("teams")
  .select("id, name, predictive_metrics, tags");

if (readError) {
  throw new Error(`Failed to read teams: ${readError.message}`);
}

const teamRows = teams ?? [];
if (teamRows.length === 0) {
  console.log("No teams found.");
  process.exit(0);
}

const ranksByTeamId = buildRankMap(teamRows);
const timestamp = new Date().toISOString();

const updates = teamRows.map((team) => {
  const generated = generateTeamTags(team.id, ranksByTeamId);
  const existing = dedupeTags(Array.isArray(team.tags) ? team.tags : []);
  const preserved = DELETE_EXISTING_TAGS
    ? []
    : existing.filter((tag) => !isGeneratedRadarTag(tag));

  return {
    id: team.id,
    tags: dedupeTags([...preserved, ...generated]),
    updated_at: timestamp,
  };
});

for (const update of updates) {
  const { error: writeError } = await supabase
    .from("teams")
    .update({
      tags: update.tags,
      updated_at: update.updated_at,
    })
    .eq("id", update.id);

  if (writeError) {
    throw new Error(`Failed to update tags for ${update.id}: ${writeError.message}`);
  }
}

console.log(
  `Updated ${updates.length} teams with radar tags (deleteExisting=${DELETE_EXISTING_TAGS}).`,
);
