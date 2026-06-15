import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-10 h-14 flex items-center gap-3 border-b bg-background/80 backdrop-blur px-4">
            <SidebarTrigger />
            <div className="text-sm text-muted-foreground">AI Workplace Productivity Assistant</div>
          </header>
          <main className="flex-1 p-6 md:p-8 max-w-6xl w-full mx-auto">
            <Outlet />
          </main>
          <footer className="px-6 md:px-8 py-6 text-xs text-muted-foreground border-t">
            <strong className="text-foreground">Responsible AI:</strong> Generated content may be inaccurate. Verify important decisions, legal, financial, or external communications before sending.
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
