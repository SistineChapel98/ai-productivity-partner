import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Settings as SettingsIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [email, setEmail] = useState<string>("");
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <SettingsIcon className="size-6 text-primary" /> Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="text-sm font-medium">{email || "—"}</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="size-4 mr-2" /> Sign out
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Responsible AI</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>AI-generated content may contain inaccuracies. Always verify before relying on it for:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Important decisions</li>
            <li>Legal or financial information</li>
            <li>External communications</li>
          </ul>
          <p>The assistant supports your judgment — it does not replace it.</p>
        </CardContent>
      </Card>
    </div>
  );
}
