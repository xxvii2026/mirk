import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsArticle } from "@/components/docs/article";
import { docs } from "@/components/docs/content";

export function generateStaticParams() {
  return docs.filter((doc) => doc.slug !== "overview").map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const doc = docs.find((page) => page.slug === slug);
  return { title: doc?.title ?? "Guide not found", description: doc?.description };
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = docs.find((page) => page.slug === slug && slug !== "overview");
  if (!doc) notFound();
  return <DocsArticle doc={doc} />;
}
