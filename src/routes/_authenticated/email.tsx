import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { generateEmail, listEmails, deleteEmail } from "@/lib/email.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Copy, Trash2, Mail } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/email")({
  component: EmailPage,
});

const TONES = ["Formal", "Friendly", "Persuasive", "Executive", "Apologetic"] as const;

function EmailPage() {
  const qc = useQueryClient();
  const gen = useServerFn(generateEmail);
  const list = useServerFn(listEmails);
  const del = useServerFn(deleteEmail);

  const [recipient, setRecipient] = useState("");
  const [purpose, setPurpose] = useState("");
  const [tone, setTone] = useState<(typeof TONES)[number]>("Formal");
  const [notes, setNotes] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const history = useQuery({ queryKey: ["emails"], queryFn: () => list() });

  const mutate = useMutation({
    mutationFn: (input: { recipient: string; purpose: string; tone: (typeof TONES)[number]; notes: string }) =>
      gen({ data: input }),
    onSuccess: (row) => {
      setSubject(row.subject);
      setBody(row.body);
      qc.invalidateQueries({ queryKey: ["emails"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Email drafted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emails"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  function loadFromHistory(row: { subject: string; body: string; recipient: string; purpose: string; tone: string; notes: string | null }) {
    setSubject(row.subject);
    setBody(row.body);
    setRecipient(row.recipient);
    setPurpose(row.purpose);
    setTone((TONES.includes(row.tone as never) ? row.tone : "Formal") as (typeof TONES)[number]);
    setNotes(row.notes ?? "");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Mail className="size-6 text-primary" /> Smart Email Generator
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Generate professional emails in the right tone.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email brief</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  mutate.mutate({ recipient, purpose, tone, notes });
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="recipient">Recipient</Label>
                    <Input id="recipient" placeholder="e.g. Sarah, Marketing Lead" required value={recipient} onChange={(e) => setRecipient(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tone">Tone</Label>
                    <Select value={tone} onValueChange={(v) => setTone(v as (typeof TONES)[number])}>
                      <SelectTrigger id="tone"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TONES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="purpose">Purpose</Label>
                  <Input id="purpose" placeholder="e.g. Schedule a project update meeting" required value={purpose} onChange={(e) => setPurpose(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Additional notes (optional)</Label>
                  <Textarea id="notes" rows={3} placeholder="Anything else to include or avoid…" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <Button type="submit" disabled={mutate.isPending}>
                  {mutate.isPending ? <><Loader2 className="size-4 animate-spin mr-2" /> Generating…</> : "Generate email"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {(subject || body) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Draft</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Subject</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Body</Label>
                  <Textarea rows={14} value={body} onChange={(e) => setBody(e.target.value)} className="font-[ui-monospace,_SFMono-Regular,_Menlo,_monospace] text-sm" />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => { navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`); toast.success("Copied"); }}>
                    <Copy className="size-4 mr-2" /> Copy
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">History</CardTitle>
          </CardHeader>
          <CardContent>
            {history.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (history.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No emails yet.</p>
            ) : (
              <ul className="space-y-2">
                {history.data!.map((e) => (
                  <li key={e.id} className="group rounded-md border p-2 hover:bg-accent/40 transition-colors">
                    <button type="button" className="w-full text-left" onClick={() => loadFromHistory(e)}>
                      <p className="text-sm font-medium truncate">{e.subject}</p>
                      <p className="text-xs text-muted-foreground truncate">{e.recipient} · {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</p>
                    </button>
                    <button type="button" className="text-xs text-destructive opacity-0 group-hover:opacity-100 transition-opacity mt-1 inline-flex items-center gap-1" onClick={() => remove.mutate(e.id)}>
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
