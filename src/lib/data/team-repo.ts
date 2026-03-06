import "server-only";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  teamInputSchema,
  teamSchema,
  type Team,
  type TeamInput,
} from "@/lib/schema/team";
import {
  teamNoteInputSchema,
  teamNoteSchema,
  teamNoteUpdateSchema,
  type TeamNote,
  type TeamNoteInput,
} from "@/lib/schema/note";

const DEFAULT_TEAM_COLOR = "#d0f2f5";

type TeamRow = {
  id: string;
  name: string;
  conference: string;
  record: unknown;
  predictive_metrics: unknown;
  resume_metrics: unknown;
  tags: string[] | null;
  seed: number | null;
  team_color: string | null;
  updated_at: string;
};

type NoteRow = {
  id: string;
  team_id: string;
  author: string;
  content: string;
  created_at: string;
  updated_at: string;
};

function getSupabaseServerClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalizeIsoDate(value: string): string {
  return new Date(value).toISOString();
}

function rowToTeam(row: TeamRow): Team {
  return teamSchema.parse({
    id: row.id,
    name: row.name,
    conference: row.conference,
    record: row.record,
    predictiveMetrics: row.predictive_metrics,
    resumeMetrics: row.resume_metrics,
    tags: row.tags ?? [],
    seed: row.seed ?? undefined,
    teamColor: row.team_color,
    updatedAt: normalizeIsoDate(row.updated_at),
  });
}

function teamToRow(team: Team): Omit<TeamRow, "updated_at"> & { updated_at: string } {
  return {
    id: team.id,
    name: team.name,
    conference: team.conference,
    record: team.record,
    predictive_metrics: team.predictiveMetrics,
    resume_metrics: team.resumeMetrics,
    tags: team.tags,
    seed: team.seed ?? null,
    team_color: team.teamColor ?? null,
    updated_at: team.updatedAt,
  };
}

function rowToNote(row: NoteRow): TeamNote {
  return teamNoteSchema.parse({
    id: row.id,
    teamId: row.team_id,
    author: row.author,
    content: row.content,
    createdAt: normalizeIsoDate(row.created_at),
    updatedAt: normalizeIsoDate(row.updated_at),
  });
}

export type TeamUpsertInput = TeamInput & { id?: string };

export interface TeamRepo {
  listTeams(): Promise<Team[]>;
  getTeam(teamId: string): Promise<Team | null>;
  upsertTeam(input: TeamUpsertInput): Promise<Team>;
  deleteTeam(teamId: string): Promise<boolean>;
  listNotes(teamId?: string): Promise<TeamNote[]>;
  addNote(input: TeamNoteInput): Promise<TeamNote>;
  updateNote(noteId: string, input: { author?: string; content?: string }): Promise<TeamNote | null>;
  deleteNote(noteId: string): Promise<boolean>;
  replaceTeams(inputs: TeamInput[]): Promise<{ total: number }>;
}

class SupabaseTeamRepo implements TeamRepo {
  private readonly supabase = getSupabaseServerClient();

  private async readTeams(): Promise<Team[]> {
    const { data, error } = await this.supabase
      .from("teams")
      .select("*");

    if (error) {
      throw new Error(`Failed to list teams: ${error.message}`);
    }

    return (data as TeamRow[]).map(rowToTeam);
  }

  private async readNotes(teamId?: string): Promise<TeamNote[]> {
    let query = this.supabase
      .from("notes")
      .select("*")
      .order("updated_at", { ascending: false });

    if (teamId) {
      query = query.eq("team_id", teamId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list notes: ${error.message}`);
    }

    return (data as NoteRow[]).map(rowToNote);
  }

  private async getTeamById(teamId: string): Promise<Team | null> {
    const { data, error } = await this.supabase
      .from("teams")
      .select("*")
      .eq("id", teamId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load team: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return rowToTeam(data as TeamRow);
  }

  private async upsertTeams(rows: Array<Omit<TeamRow, "updated_at"> & { updated_at: string }>) {
    const { error } = await this.supabase
      .from("teams")
      .upsert(rows, { onConflict: "id" });

    if (error) {
      throw new Error(`Failed to upsert teams: ${error.message}`);
    }
  }

  async listTeams(): Promise<Team[]> {
    const teams = await this.readTeams();
    return teams.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getTeam(teamId: string): Promise<Team | null> {
    return this.getTeamById(teamId);
  }

  async upsertTeam(input: TeamUpsertInput): Promise<Team> {
    const validatedInput = teamInputSchema.parse(input);
    const timestamp = new Date().toISOString();

    const resolvedId = input.id?.trim() || validatedInput.id;
    const nextTeam = teamSchema.parse({
      ...validatedInput,
      id: resolvedId,
      updatedAt: timestamp,
    });

    const { data, error } = await this.supabase
      .from("teams")
      .upsert(teamToRow(nextTeam), { onConflict: "id" })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to upsert team: ${error.message}`);
    }

    return rowToTeam(data as TeamRow);
  }

  async deleteTeam(teamId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("teams")
      .delete()
      .eq("id", teamId)
      .select("id");

    if (error) {
      throw new Error(`Failed to delete team: ${error.message}`);
    }

    return (data ?? []).length > 0;
  }

  async listNotes(teamId?: string): Promise<TeamNote[]> {
    return this.readNotes(teamId);
  }

  async addNote(input: TeamNoteInput): Promise<TeamNote> {
    const validatedInput = teamNoteInputSchema.parse(input);

    const existingTeam = await this.getTeamById(validatedInput.teamId);
    if (!existingTeam) {
      throw new Error(`Team with id '${validatedInput.teamId}' does not exist.`);
    }

    const timestamp = new Date().toISOString();
    const note = {
      id: randomUUID(),
      ...validatedInput,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const { data, error } = await this.supabase
      .from("notes")
      .insert({
        id: note.id,
        team_id: note.teamId,
        author: note.author,
        content: note.content,
        created_at: note.createdAt,
        updated_at: note.updatedAt,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to add note: ${error.message}`);
    }

    return rowToNote(data as NoteRow);
  }

  async updateNote(
    noteId: string,
    input: { author?: string; content?: string },
  ): Promise<TeamNote | null> {
    const validatedInput = teamNoteUpdateSchema.partial().parse(input);
    const { data, error } = await this.supabase
      .from("notes")
      .update({
        ...("author" in validatedInput ? { author: validatedInput.author } : {}),
        ...("content" in validatedInput ? { content: validatedInput.content } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", noteId)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update note: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return rowToNote(data as NoteRow);
  }

  async deleteNote(noteId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("notes")
      .delete()
      .eq("id", noteId)
      .select("id");

    if (error) {
      throw new Error(`Failed to delete note: ${error.message}`);
    }

    return (data ?? []).length > 0;
  }

  async replaceTeams(inputs: TeamInput[]): Promise<{ total: number }> {
    const { data, error } = await this.supabase
      .from("teams")
      .select("id, team_color");

    if (error) {
      throw new Error(`Failed to read existing teams for replace: ${error.message}`);
    }

    const existingTeamColorById = new Map(
      ((data ?? []) as Array<{ id: string; team_color: string | null }>).map(
        (team) => [team.id, team.team_color],
      ),
    );

    const validated = inputs.map((input) => {
      const team = teamInputSchema.parse(input);
      const existingTeamColor = existingTeamColorById.get(team.id);

      return teamSchema.parse({
        ...team,
        teamColor: existingTeamColor ?? team.teamColor ?? DEFAULT_TEAM_COLOR,
        updatedAt: new Date().toISOString(),
      });
    });

    await this.upsertTeams(validated.map(teamToRow));

    return { total: validated.length };
  }
}

export const teamRepo: TeamRepo = new SupabaseTeamRepo();
