"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/teams", label: "Teams" },
  { href: "/compare", label: "Compare" },
  { href: "/bracket", label: "Bracket" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const contentMaxWidth =
    pathname.startsWith("/compare") || pathname.startsWith("/bracket")
      ? "max-w-[120rem]"
      : "max-w-6xl";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className={cn("mx-auto flex w-full items-center justify-between px-6 py-4", contentMaxWidth)}>
          <div>
            <p className="text-sm font-medium text-muted-foreground">March Madness</p>
            <h1 className="text-xl font-bold">Team Sheets</h1>
          </div>

          <nav className="flex items-center gap-2">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className={cn("mx-auto w-full px-6 py-6", contentMaxWidth)}>{children}</main>
    </div>
  );
}
