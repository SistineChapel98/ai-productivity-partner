import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableGateway, DEFAULT_MODEL } from "./ai-gateway.server";

const PlanInput = z.object({
  tasks: z.string().trim().min(1).max(5000),
  availableHours: z.number().min(0.5).max(16),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).default("09:00"),
});

const ScheduleSchema = z.object({
  strategy: z.string(),
  blocks: z.array(
    z.object({
      start: z.string(),
      end: z.string(),
      title: z.string(),
      priority: z.enum(["high", "medium", "low"]),
      rationale: z.string(),
    }),
  ),
});

export type TaskSchedule = z.infer<typeof ScheduleSchema>;

export const planTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PlanInput.parse(input))
  .handler(async ({ data, context }) => {
    const gateway = createLovableGateway();
    const { experimental_output } = await generateText({
      model: gateway(DEFAULT_MODEL),
      experimental_output: Output.object({ schema: ScheduleSchema }),
      prompt: `Act as an executive productivity coach. Build an optimal daily schedule.

Tasks (one per line):
${data.tasks}

Available working hours today: ${data.availableHours}
Start time: ${data.startTime}

Prioritize by urgency, importance, and dependencies. Produce time-blocked entries with start/end times (HH:MM, 24h) within the available window starting at the start time. Each block needs a clear priority label and a one-sentence rationale. Include a 1-2 sentence overall strategy.`,
    });

    const { data: row, error } = await context.supabase
      .from("task_plans")
      .insert({
        user_id: context.userId,
        input_tasks: data.tasks,
        available_hours: data.availableHours,
        start_time: data.startTime,
        schedule: experimental_output,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("task_plans")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deletePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("task_plans").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
