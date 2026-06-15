import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { summarizeMeeting, listNotes, deleteNote, type MeetingSummary } from "@/lib/notes.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2, FileText, CheckCircle2, AlertTriangle, Calendar, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/notes")({
  component: NotesPage,
});

function NotesPage() {
  const qc = useQueryClient();
  const sum = useServerFn(summarizeMeeting);
  const list = useServerFn(listNotes);
  const del = useServerFn(deleteNote);

  const [text, setText] = useState("");
  const [active, setActive] = useState<MeetingSummary | null>(null);

  const history = useQuery({ queryKey: ["notes"], queryFn: () => list() });

  const mutate = useMutation({
    mutationFn: (input: { text: string }) => sum({ data: input }),
    onSuccess: (row) => {
      setActive(row.summary as MeetingSummary);
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Summary ready");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <FileText className="size-6 text-primary" /> Meeting Notes Summarizer
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Turn long notes into clear, actionable summaries.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Paste meeting notes</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  mutate.mutate({ text });
                }}
              >
                <Textarea rows={12} placeholder="Paste transcript or rough notes here…" value={text} onChange={(e) => setText(e.target.value)} required minLength={20} />
                <Button type="submit" disabled={mutate.isPending}>
                  {mutate.isPending ? <><Loader2 className="size-4 animate-spin mr-2" /> Summarizing…</> : "Summarize"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {active && <SummaryView summary={active} />}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">History</CardTitle>
          </CardHeader>
          <CardContent>
            {history.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (history.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No summaries yet.</p>
            ) : (
              <ul className="space-y-2">
                {history.data!.map((n) => (
                  <li key={n.id} className="group rounded-md border p-2 hover:bg-accent/40 transition-colors">
                    <button type="button" className="w-full text-left" onClick={() => setActive(n.summary as MeetingSummary)}>
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                    </button>
                    <button type="button" className="text-xs text-destructive opacity-0 group-hover:opacity-100 transition-opacity mt-1 inline-flex items-center gap-1" onClick={() => remove.mutate(n.id)}>
                      <Trash2 className="size-3" /> Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryView({ summary }: { summary: MeetingSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{summary.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <Section title="Executive summary">
          <p className="text-sm leading-relaxed">{summary.executive_summary}</p>
        </Section>

        {summary.key_decisions.length > 0 && (
          <Section title="Key decisions" icon={CheckCircle2}>
            <ul className="text-sm space-y-1 list-disc pl-5">
              {summary.key_decisions.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </Section>
        )}

        {summary.action_items.length > 0 && (
          <Section title="Action items" icon={ListChecks}>
            <ul className="text-sm space-y-1.5">
              {summary.action_items.map((a, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-medium text-foreground">{a.owner}:</span>
                  <span className="text-muted-foreground">{a.task}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {summary.deadlines.length > 0 && (
          <Section title="Deadlines" icon={Calendar}>
            <ul className="text-sm space-y-1.5">
              {summary.deadlines.map((d, i) => (
                <li key={i} className="flex justify-between gap-3 border-b last:border-0 pb-1.5">
                  <span>{d.what}</span>
                  <span className="text-muted-foreground tabular-nums">{d.when}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {summary.risks.length > 0 && (
          <Section title="Risks" icon={AlertTriangle}>
            <ul className="text-sm space-y-1 list-disc pl-5">
              {summary.risks.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </Section>
        )}
      </CardContent>
    </Card>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: typeof CheckCircle2; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
        {Icon && <Icon className="size-4 text-primary" />} {title}
      </h3>
      {children}
    </div>
  );
}
