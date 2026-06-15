import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableGateway, DEFAULT_MODEL } from "./ai-gateway.server";

const SummarizeInput = z.object({
  text: z.string().trim().min(20).max(50000),
});

const SummarySchema = z.object({
  title: z.string(),
  executive_summary: z.string(),
  key_decisions: z.array(z.string()),
  action_items: z.array(z.object({ owner: z.string(), task: z.string() })),
  deadlines: z.array(z.object({ what: z.string(), when: z.string() })),
  risks: z.array(z.string()),
});

export type MeetingSummary = z.infer<typeof SummarySchema>;

export const summarizeMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SummarizeInput.parse(input))
  .handler(async ({ data, context }) => {
    const gateway = createLovableGateway();
    const { experimental_output } = await generateText({
      model: gateway(DEFAULT_MODEL),
      experimental_output: Output.object({ schema: SummarySchema }),
      prompt: `Analyze the following meeting notes / transcript. Extract a short title, executive summary, key decisions, action items (owner + task), deadlines (what + when), and risks. Be concise and factual; do not invent facts that aren't supported by the text.

MEETING NOTES:
${data.text}`,
    });

    const { data: row, error } = await context.supabase
      .from("meeting_notes")
      .insert({
        user_id: context.userId,
        title: experimental_output.title,
        source_text: data.text,
        summary: experimental_output,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("meeting_notes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("meeting_notes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
