import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [emails, notes, plans, recentEmails, recentNotes, recentPlans] = await Promise.all([
      context.supabase.from("emails").select("id", { count: "exact", head: true }),
      context.supabase.from("meeting_notes").select("id", { count: "exact", head: true }),
      context.supabase.from("task_plans").select("id", { count: "exact", head: true }),
      context.supabase.from("emails").select("id, subject, recipient, created_at").order("created_at", { ascending: false }).limit(5),
      context.supabase.from("meeting_notes").select("id, title, created_at").order("created_at", { ascending: false }).limit(5),
      context.supabase.from("task_plans").select("id, created_at").order("created_at", { ascending: false }).limit(5),
    ]);

    type Activity = { id: string; kind: "email" | "note" | "plan"; label: string; created_at: string };
    const activity: Activity[] = [
      ...(recentEmails.data ?? []).map((e) => ({ id: e.id, kind: "email" as const, label: `${e.subject} → ${e.recipient}`, created_at: e.created_at })),
      ...(recentNotes.data ?? []).map((n) => ({ id: n.id, kind: "note" as const, label: n.title, created_at: n.created_at })),
      ...(recentPlans.data ?? []).map((p) => ({ id: p.id, kind: "plan" as const, label: "Daily schedule", created_at: p.created_at })),
    ]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 8);

    return {
      counts: {
        emails: emails.count ?? 0,
        notes: notes.count ?? 0,
        plans: plans.count ?? 0,
      },
      activity,
    };
  });
