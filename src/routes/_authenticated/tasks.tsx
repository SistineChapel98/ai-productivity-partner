import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { planTasks, listPlans, deletePlan, type TaskSchedule } from "@/lib/tasks.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksPage,
});

function TasksPage() {
  const qc = useQueryClient();
  const plan = useServerFn(planTasks);
  const list = useServerFn(listPlans);
  const del = useServerFn(deletePlan);

  const [tasks, setTasks] = useState("");
  const [hours, setHours] = useState(8);
  const [startTime, setStartTime] = useState("09:00");
  const [active, setActive] = useState<TaskSchedule | null>(null);

  const history = useQuery({ queryKey: ["plans"], queryFn: () => list() });

  const mutate = useMutation({
    mutationFn: (input: { tasks: string; availableHours: number; startTime: string }) =>
      plan({ data: input }),
    onSuccess: (row) => {
      setActive(row.schedule as TaskSchedule);
      qc.invalidateQueries({ queryKey: ["plans"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Schedule ready");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ListChecks className="size-6 text-primary" /> AI Task Planner
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Get an optimized, time-blocked schedule for your day.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Today's inputs</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  mutate.mutate({ tasks, availableHours: hours, startTime });
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="tasks">Tasks (one per line)</Label>
                  <Textarea id="tasks" rows={8} placeholder={"Finish client proposal\nTeam meeting\nReview Q3 report"} value={tasks} onChange={(e) => setTasks(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="hours">Available hours</Label>
                    <Input id="hours" type="number" min={0.5} max={16} step={0.5} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="start">Start time</Label>
                    <Input id="start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                </div>
                <Button type="submit" disabled={mutate.isPending}>
                  {mutate.isPending ? <><Loader2 className="size-4 animate-spin mr-2" /> Planning…</> : "Generate schedule"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {active && <ScheduleView schedule={active} />}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">History</CardTitle>
          </CardHeader>
          <CardContent>
            {history.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (history.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No plans yet.</p>
            ) : (
              <ul className="space-y-2">
                {history.data!.map((p) => (
                  <li key={p.id} className="group rounded-md border p-2 hover:bg-accent/40 transition-colors">
                    <button type="button" className="w-full text-left" onClick={() => setActive(p.schedule as TaskSchedule)}>
                      <p className="text-sm font-medium">Plan · {Number(p.available_hours)}h</p>
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</p>
                    </button>
                    <button type="button" className="text-xs text-destructive opacity-0 group-hover:opacity-100 transition-opacity mt-1 inline-flex items-center gap-1" onClick={() => remove.mutate(p.id)}>
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

function ScheduleView({ schedule }: { schedule: TaskSchedule }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Schedule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground italic">{schedule.strategy}</p>
        <ul className="space-y-2">
          {schedule.blocks.map((b, i) => (
            <li key={i} className="rounded-lg border p-3 flex gap-3">
              <div className="text-sm font-mono tabular-nums text-muted-foreground w-24 shrink-0">
                {b.start}–{b.end}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{b.title}</p>
                  <PriorityBadge p={b.priority} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{b.rationale}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function PriorityBadge({ p }: { p: "high" | "medium" | "low" }) {
  const cls = p === "high" ? "bg-destructive/10 text-destructive" : p === "medium" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground";
  return <Badge variant="secondary" className={cls}>{p}</Badge>;
}
