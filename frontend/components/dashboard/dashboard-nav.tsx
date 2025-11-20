"use client";

import {
  Code,
  Home,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  Shield,
  User,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAdmin } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { User as UserType } from "@/types/api";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/overview",
    icon: LayoutDashboard,
    description: "Overview and quick actions",
  },
  {
    title: "Profile",
    href: "/profile",
    icon: User,
    description: "View and edit your profile",
  },
  {
    title: "Settings",
    href: "/profile/settings",
    icon: Settings,
    description: "Account settings and password",
  },
  {
    title: "Security",
    href: "/profile/security",
    icon: Shield,
    description: "Two-factor authentication",
  },
  {
    title: "Components",
    href: "/components",
    icon: Code,
    description: "UI component library",
  },
  {
    title: "Admin Panel",
    href: "/admin",
    icon: UserCog,
    description: "Administrative dashboard",
    adminOnly: true,
  },
  {
    title: "User Management",
    href: "/admin/users",
    icon: Users,
    description: "Manage users and roles",
    adminOnly: true,
  },
  {
    title: "Home",
    href: "/",
    icon: Home,
    description: "Back to homepage",
  },
];

interface DashboardNavProps {
  user?: UserType | null;
  className?: string;
}

export function DashboardNav({ user, className }: DashboardNavProps) {
  const pathname = usePathname();
  const userIsAdmin = isAdmin(user);

  // Filter nav items based on admin status
  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || userIsAdmin,
  );

  return (
    <nav className={cn("space-y-1", className)}>
      {filteredNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
              isActive
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            <div className="flex-1">
              <div>{item.title}</div>
              {item.description && (
                <div className="text-xs text-muted-foreground">
                  {item.description}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

interface DashboardNavCardsProps {
  user?: UserType | null;
  className?: string;
}

export function DashboardNavCards({ user, className }: DashboardNavCardsProps) {
  const userIsAdmin = isAdmin(user);

  // Filter nav items based on admin status (exclude Home)
  const filteredNavItems = navItems
    .filter((item) => !item.adminOnly || userIsAdmin)
    .filter((item) => item.href !== "/");

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
      {filteredNavItems.map((item) => {
        const Icon = item.icon;

        return (
          <Link key={item.href} href={item.href} className="block group">
            <div className="rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
