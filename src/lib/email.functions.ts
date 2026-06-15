import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableGateway, DEFAULT_MODEL } from "./ai-gateway.server";

const GenerateInput = z.object({
  recipient: z.string().trim().min(1).max(200),
  purpose: z.string().trim().min(1).max(1000),
  tone: z.enum(["Formal", "Friendly", "Persuasive", "Executive", "Apologetic"]),
  notes: z.string().trim().max(2000).optional().default(""),
});

export const generateEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data, context }) => {
    const gateway = createLovableGateway();
    const { experimental_output } = await generateText({
      model: gateway(DEFAULT_MODEL),
      experimental_output: Output.object({
        schema: z.object({
          subject: z.string(),
          body: z.string(),
        }),
      }),
      prompt: `You are a professional workplace communication expert. Generate a workplace email.

Recipient: ${data.recipient}
Purpose: ${data.purpose}
Tone: ${data.tone}
Additional notes: ${data.notes || "(none)"}

Requirements:
- Clear, concise subject line
- Professional language matching the requested tone
- Proper greeting and sign-off
- Strong, clear call to action
- Body should be ready-to-send plain text (no markdown)`,
    });

    const { subject, body } = experimental_output;

    const { data: row, error } = await context.supabase
      .from("emails")
      .insert({
        user_id: context.userId,
        recipient: data.recipient,
        purpose: data.purpose,
        tone: data.tone,
        notes: data.notes,
        subject,
        body,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listEmails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("emails")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("emails").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
