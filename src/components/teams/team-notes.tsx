"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import type { TeamNote } from "@/lib/schema/note";

type TeamNotesProps = {
  teamId: string;
  initialNotes: TeamNote[];
  editable?: boolean;
  notesListClassName?: string;
};

export function TeamNotes({
  teamId,
  initialNotes,
  editable = true,
  notesListClassName = "space-y-3",
}: TeamNotesProps) {
  const router = useRouter();
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editAuthor, setEditAuthor] = useState("");
  const [editContent, setEditContent] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function addNote() {
    if (!author.trim() || !content.trim()) {
      setStatus("Author and note content are required.");
      return;
    }

    setLoading(true);
    setStatus("Saving note...");

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamId,
          author,
          content,
        }),
      });

      if (!response.ok) {
        setStatus("Failed to save note.");
        return;
      }

      setAuthor("");
      setContent("");
      setStatus("Note added.");
      router.refresh();
    } catch {
      setStatus("Failed to save note.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteNote(noteId: string) {
    setLoading(true);
    setStatus("Deleting note...");

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setStatus("Failed to delete note.");
        return;
      }

      setStatus("Note deleted.");
      router.refresh();
    } catch {
      setStatus("Failed to delete note.");
    } finally {
      setLoading(false);
    }
  }

  function startEditing(note: TeamNote) {
    setEditingNoteId(note.id);
    setEditAuthor(note.author);
    setEditContent(note.content);
    setStatus("");
  }

  function cancelEditing() {
    setEditingNoteId(null);
    setEditAuthor("");
    setEditContent("");
    setStatus("");
  }

  async function updateNote(noteId: string) {
    if (!editAuthor.trim() || !editContent.trim()) {
      setStatus("Author and note content are required.");
      return;
    }

    setLoading(true);
    setStatus("Updating note...");

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          author: editAuthor,
          content: editContent,
        }),
      });

      if (!response.ok) {
        setStatus("Failed to update note.");
        return;
      }

      cancelEditing();
      setStatus("Note updated.");
      router.refresh();
    } catch {
      setStatus("Failed to update note.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="text-lg font-semibold">Notes</h3>
        <p className="text-sm text-muted-foreground">
          {editable ? "Capture your group scouting notes per team." : "Scouting notes for this team."}
        </p>
      </div>

      {editable ? (
        <div className="space-y-2">
          <Input
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            placeholder="Author"
            disabled={loading}
          />
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Write note..."
            disabled={loading}
          />
          <Button type="button" onClick={addNote} disabled={loading}>
            Add Note
          </Button>
        </div>
      ) : null}

      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}

      <Separator />

      <div className={notesListClassName}>
        {initialNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          initialNotes.map((note) => (
            <div key={note.id} className="rounded-md border p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {editingNoteId === note.id ? "Editing note" : note.author}
                </p>
                {editable ? (
                  <div className="flex items-center gap-2">
                    {editingNoteId === note.id ? (
                      <>
                        <Button type="button" variant="secondary" size="sm" onClick={cancelEditing} disabled={loading}>
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateNote(note.id)}
                          disabled={loading}
                        >
                          Save
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => startEditing(note)}
                          disabled={loading}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => deleteNote(note.id)}
                          disabled={loading}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
              {editingNoteId === note.id ? (
                <div className="space-y-2">
                  <Input
                    value={editAuthor}
                    onChange={(event) => setEditAuthor(event.target.value)}
                    placeholder="Author"
                    disabled={loading}
                  />
                  <Textarea
                    value={editContent}
                    onChange={(event) => setEditContent(event.target.value)}
                    placeholder="Write note..."
                    disabled={loading}
                  />
                </div>
              ) : (
                <p className="text-sm">{note.content}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Updated {new Date(note.updatedAt).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
