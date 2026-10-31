import Link from "next/link";
import { docs, docHref, type DocPage } from "./content";
import {
  ASSETS,
  CHAIN_ID,
  EXPLORER_URL,
  POOL_ADDRESS,
  PAY_MEMO_ADDRESS,
  POOL_CONFIGURED,
  REGISTRY_ADDRESS,
  addressUrl,
} from "@/lib/robinhood/network";

export function DocsArticle({ doc }: { doc: DocPage }) {
  const index = docs.findIndex((page) => page.slug === doc.slug);
  const previous = docs[index - 1];
  const next = docs[index + 1];
  return (
    <div className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_190px]">
      <main id="docs-content" className="min-w-0 px-5 py-10 sm:px-10 sm:py-14 lg:px-14">
        <article className="mx-auto max-w-[70ch]">
          <h1 className="text-[36px] leading-[1.12] font-light tracking-[-0.03em] sm:text-[44px]">{doc.heading}</h1>
          <p className="text-ink-2 mt-5 text-lg leading-relaxed">{doc.description}</p>
          {doc.slug === "overview" ? (
            <div className="border-line mt-8 flex flex-wrap gap-3 border-b pb-8">
              <Link href="/docs/quickstart" className="btn btn-accent min-h-11 px-5 text-sm">
                Start with Quickstart
              </Link>
              <Link href="/docs/privacy" className="btn btn-light min-h-11 px-5 text-sm">
                What stays private
              </Link>
            </div>
          ) : null}
          <div className="mt-10 space-y-10">
            {doc.sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-28">
                <h2 className="text-[23px] leading-snug font-medium tracking-[-0.02em]">
                  <a href={`#${section.id}`} className="underline-offset-4 hover:underline">
                    {section.title}
                  </a>
                </h2>
                <p className="text-ink-2 mt-4 text-[16px] leading-[1.85]">{section.text}</p>
              </section>
            ))}
          </div>
          {doc.slug === "network" ? (
            <div className="border-line mt-10 overflow-hidden rounded-xl border">
              <dl className="divide-line divide-y text-sm">
                {[
                  ["Chain ID", String(CHAIN_ID)],
                  ["Assets", ASSETS.map((asset) => asset.symbol).join(", ")],
                  ["Shielded pool", POOL_CONFIGURED ? POOL_ADDRESS : null],
                  ["Message board", POOL_CONFIGURED ? PAY_MEMO_ADDRESS : null],
                  ["Account registry", REGISTRY_ADDRESS],
                ].map(([name, value]) => (
                  <div key={name} className="space-y-2 p-4">
                    <dt className="text-muted">{name}</dt>
                    <dd className="break-all">
                      {value?.startsWith("0x") ? (
                        <a
                          className="underline underline-offset-4"
                          href={addressUrl(value as `0x${string}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {value}
                        </a>
                      ) : (
                        (value ?? "Not configured on this deployment")
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="border-line border-t p-4 text-sm">
                <a
                  href={EXPLORER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  Open network explorer
                </a>
              </p>
            </div>
          ) : null}
          {doc.slug === "overview" ? (
            <div className="border-line mt-12 border-t pt-8">
              <h2 className="text-xl font-medium">Find your next guide</h2>
              <div className="mt-4 divide-y divide-[var(--line)]">
                {docs
                  .filter((page) => ["send-receive", "backups", "shielded-pool"].includes(page.slug))
                  .map((page) => (
                    <Link key={page.slug} href={docHref(page.slug)} className="group block py-4">
                      <span className="group-hover:text-signal-text font-medium">
                        {page.title} <span aria-hidden>→</span>
                      </span>
                      <p className="text-muted mt-1 text-sm">{page.description}</p>
                    </Link>
                  ))}
              </div>
            </div>
          ) : null}
          <nav aria-label="Documentation pages" className="border-line mt-14 grid grid-cols-2 gap-6 border-t pt-6">
            <div>
              {previous ? (
                <Link href={docHref(previous.slug)} className="hover:text-signal-text block py-2">
                  <span className="text-muted block text-xs">Previous</span>
                  <span className="mt-2 block text-sm">← {previous.title}</span>
                </Link>
              ) : null}
            </div>
            <div className="text-right">
              {next ? (
                <Link href={docHref(next.slug)} className="hover:text-signal-text block py-2">
                  <span className="text-muted block text-xs">Next</span>
                  <span className="mt-2 block text-sm">{next.title} →</span>
                </Link>
              ) : null}
            </div>
          </nav>
          <footer className="text-muted mt-12 flex gap-5 pb-4 text-xs">
            <Link href="/contracts">Contracts</Link>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/risk">Risk disclosures</Link>
          </footer>
        </article>
      </main>
      <aside className="hidden px-4 py-14 xl:block">
        <nav aria-label="On this page" className="sticky top-32">
          <h2 className="text-sm font-medium">On this page</h2>
          <ul className="text-muted mt-4 space-y-3 text-xs leading-relaxed">
            {doc.sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="hover:text-ink block py-1">
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </div>
  );
}
