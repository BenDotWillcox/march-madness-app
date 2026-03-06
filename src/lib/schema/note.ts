import { z } from "zod";

export const teamNoteSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  author: z.string().min(1),
  content: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const teamNoteInputSchema = teamNoteSchema.pick({
  teamId: true,
  author: true,
  content: true,
});

export const teamNoteUpdateSchema = teamNoteSchema.pick({
  author: true,
  content: true,
});

export const notesFileSchema = z.array(teamNoteSchema);

export type TeamNote = z.infer<typeof teamNoteSchema>;
export type TeamNoteInput = z.infer<typeof teamNoteInputSchema>;
