"use client";

import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { Logo } from "@/components/ui/logo";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { withAuth } from "@/lib/with-auth";
import {
  PageHeaderProvider,
  usePageHeader,
} from "@/contexts/page-header-context";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { title, description, icon, actions } = usePageHeader();

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Logo size="sm" showText={true} className="md:hidden" />
          </div>

          {/* Page Title Section */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {icon && <div className="shrink-0">{icon}</div>}
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold truncate">{title}</h1>
              {description && (
                <p className="text-xs text-muted-foreground truncate hidden sm:block">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Actions and Mode Toggle */}
          <div className="flex items-center gap-2 ml-auto">
            {actions}
            <ModeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </>
  );
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <PageHeaderProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </PageHeaderProvider>
    </SidebarProvider>
  );
}

// Protect the dashboard section with authentication
export default withAuth(DashboardLayout);
