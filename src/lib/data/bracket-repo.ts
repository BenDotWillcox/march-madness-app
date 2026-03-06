import { promises as fs } from "node:fs";
import path from "node:path";
import { validateBracketLinks } from "@/lib/bracket/engine";
import { createInitialBracketState } from "@/lib/bracket/initial-state";
import { bracketStateSchema, type BracketState } from "@/lib/schema/bracket";

const bracketFilePath = path.join(process.cwd(), "data", "bracket.json");

export async function loadBracketState(): Promise<BracketState> {
  const fallback = createInitialBracketState();

  let raw: unknown;
  try {
    const file = await fs.readFile(bracketFilePath, "utf8");
    raw = JSON.parse(file) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }

    return fallback;
  }

  const parsed = bracketStateSchema.safeParse(raw);
  if (!parsed.success) {
    return fallback;
  }

  if (parsed.data.games.length === 0) {
    return createInitialBracketState(parsed.data.year);
  }

  const linkErrors = validateBracketLinks(parsed.data);
  if (linkErrors.length > 0) {
    return createInitialBracketState(parsed.data.year);
  }

  return parsed.data;
}
