import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const teams = JSON.parse(await readFile("data/teams.json", "utf8"));
const notes = JSON.parse(await readFile("data/notes.json", "utf8"));

function normalizeTags(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((tag) => {
      if (typeof tag === "string") {
        const label = tag.trim();
        return label ? { label, type: "strength" } : null;
      }

      if (!tag || typeof tag !== "object") {
        return null;
      }

      const label = typeof tag.label === "string" ? tag.label.trim() : "";
      if (!label) {
        return null;
      }

      return {
        label,
        type: tag.type === "weakness" ? "weakness" : "strength",
      };
    })
    .filter(Boolean);
}

const teamRows = teams.map((t) => ({
  id: t.id,
  name: t.name,
  conference: t.conference,
  record: t.record,
  predictive_metrics: t.predictiveMetrics,
  resume_metrics: t.resumeMetrics,
  tags: normalizeTags(t.tags),
  seed: t.seed ?? null,
  team_color: t.teamColor ?? null,
  updated_at: t.updatedAt,
}));

const noteRows = notes.map((n) => ({
  id: n.id,
  team_id: n.teamId,
  author: n.author,
  content: n.content,
  created_at: n.createdAt,
  updated_at: n.updatedAt,
}));

const { error: teamError } = await supabase.from("teams").upsert(teamRows, { onConflict: "id" });
if (teamError) throw teamError;

const { error: noteError } = await supabase.from("notes").upsert(noteRows, { onConflict: "id" });
if (noteError) throw noteError;

console.log(`Imported ${teamRows.length} teams and ${noteRows.length} notes`);