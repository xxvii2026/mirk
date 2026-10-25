import { Card, PageHeader, Pill } from "./ui";

/** Honest placeholder: a title, one sentence, and a status. No controls that pretend to work. */
export function ComingSoon({ title, sentence }: { title: string; sentence: string }) {
  return (
    <div className="fade-in mx-auto max-w-lg">
      <PageHeader title={title} />
      <Card className="space-y-4">
        <Pill>Coming soon</Pill>
        <p className="text-muted text-[17px] font-semibold">{sentence}</p>
      </Card>
    </div>
  );
}
