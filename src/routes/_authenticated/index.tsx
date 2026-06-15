import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, FileText, ListChecks, ArrowRight, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

function Dashboard() {
  const fn = useServerFn(getDashboardStats);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fn(),
  });

  const counts = data?.counts ?? { emails: 0, notes: 0, plans: 0 };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground mt-1">Your AI-powered workspace at a glance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Emails generated" value={counts.emails} icon={Mail} href="/email" />
        <StatCard label="Meetings summarized" value={counts.notes} icon={FileText} href="/notes" />
        <StatCard label="Plans created" value={counts.plans} icon={ListChecks} href="/tasks" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (data?.activity ?? []).length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="divide-y">
                {data!.activity.map((a) => (
                  <li key={`${a.kind}-${a.id}`} className="py-3 flex items-start gap-3">
                    <KindIcon kind={a.kind} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.label}</p>
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })} · {kindLabel(a.kind)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 via-card to-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Quick start
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickLink to="/email" label="Draft a professional email" />
            <QuickLink to="/notes" label="Summarize meeting notes" />
            <QuickLink to="/tasks" label="Plan your day" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, href }: { label: string; value: number; icon: typeof Mail; href: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-semibold mt-1 tabular-nums">{value}</p>
          </div>
          <div className="size-10 rounded-lg bg-accent text-accent-foreground grid place-items-center">
            <Icon className="size-5" />
          </div>
        </div>
        <Link to={href} className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-4">
          Open <ArrowRight className="size-3" />
        </Link>
      </CardContent>
    </Card>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Button asChild variant="ghost" className="w-full justify-between">
      <Link to={to}>
        <span>{label}</span>
        <ArrowRight className="size-4" />
      </Link>
    </Button>
  );
}

function KindIcon({ kind }: { kind: "email" | "note" | "plan" }) {
  const Icon = kind === "email" ? Mail : kind === "note" ? FileText : ListChecks;
  return (
    <div className="size-8 rounded-md bg-accent text-accent-foreground grid place-items-center shrink-0">
      <Icon className="size-4" />
    </div>
  );
}

function kindLabel(k: "email" | "note" | "plan") {
  return k === "email" ? "Email" : k === "note" ? "Meeting notes" : "Task plan";
}

function EmptyState() {
  return (
    <div className="text-center py-8">
      <p className="text-sm text-muted-foreground">No activity yet. Pick a tool from the sidebar to get started.</p>
    </div>
  );
}
