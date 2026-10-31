import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/wordmark";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { DocsMobileNavigation, DocsNavigation } from "@/components/docs/navigation";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-canvas text-ink min-h-dvh">
      <a
        href="#docs-content"
        className="focus:bg-surface sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:p-3"
      >
        Skip to content
      </a>
      <header className="border-line bg-canvas sticky top-0 z-30 border-b">
        <div className="mx-auto flex h-18 max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="Mirk home" className="flex min-h-11 items-center gap-2.5">
              <Logo className="size-7" />
              <span className="text-lg font-medium tracking-tight">Mirk</span>
            </Link>
            <span className="text-muted" aria-hidden>
              /
            </span>
            <Link href="/docs" className="text-ink-2 min-h-11 content-center text-sm">
              Docs
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/app" className="btn btn-accent min-h-10 px-4 text-sm">
              Open Mirk
            </Link>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1440px] md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[264px_minmax(0,1fr)]">
        <aside className="border-line hidden border-r px-5 py-8 md:sticky md:top-18 md:block md:h-[calc(100dvh-4.5rem)] md:overflow-y-auto lg:px-7">
          <DocsNavigation />
        </aside>
        <div className="min-w-0">
          <DocsMobileNavigation />
          {children}
        </div>
      </div>
    </div>
  );
}
