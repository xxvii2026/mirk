"use client";

import { useCallback, useRef, useState } from "react";
import type { Hex } from "viem";
import { Button, ExternalLink, Notice, cx } from "@/components/shared/ui";
import { FlowError, type ServiceContext, type Step } from "@/lib/gloam/services";
import { userMessage } from "@/lib/gloam/errors";
import { useServiceContext } from "@/lib/hooks/use-service";
import { txUrl } from "@/lib/robinhood/network";

type Phase = "idle" | "running" | "done" | "error";

export interface FlowState<T> {
  phase: Phase;
  step: Step | null;
  part: { part: number; parts: number } | null;
  error: string | null;
  relayFailed: boolean;
  result: T | null;
  run: (opts?: { allowWalletSubmit?: boolean }) => Promise<void>;
  reset: () => void;
}

/** Runs one service call with live progress, truthful errors and an opt-in wallet fallback. */
export function useFlow<T>(action: (ctx: ServiceContext) => Promise<T>): FlowState<T> {
  const base = useServiceContext();
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState<Step | null>(null);
  const [part, setPart] = useState<FlowState<T>["part"]>(null);
  const [error, setError] = useState<string | null>(null);
  const [relayFailed, setRelayFailed] = useState(false);
  const [result, setResult] = useState<T | null>(null);
  const running = useRef(false);

  const run = useCallback(
    async (opts?: { allowWalletSubmit?: boolean }) => {
      if (!base || running.current) return;
      running.current = true;
      setPhase("running");
      setError(null);
      setRelayFailed(false);
      setStep("preparing");
      try {
        const r = await action({
          ...base,
          allowWalletSubmit: opts?.allowWalletSubmit ?? false,
          onStep: (s, d) => {
            setStep(s);
            if (d?.parts) setPart({ part: d.part ?? 1, parts: d.parts });
          },
        });
        setResult(r);
        setPhase("done");
      } catch (e) {
        setRelayFailed(e instanceof FlowError && e.code === "relay-unavailable");
        setError(userMessage(e));
        setPhase("error");
      } finally {
        running.current = false;
      }
    },
    [base, action],
  );

  const reset = useCallback(() => {
    setPhase("idle");
    setStep(null);
    setPart(null);
    setError(null);
    setRelayFailed(false);
    setResult(null);
  }, []);

  return { phase, step, part, error, relayFailed, result, run, reset };
}

export interface StepDef {
  key: Step | Step[];
  label: string;
}

export function FlowProgress({
  steps,
  current,
  part,
}: {
  steps: StepDef[];
  current: Step | null;
  part?: { part: number; parts: number } | null;
}) {
  const idx =
    current === "done"
      ? steps.length
      : steps.findIndex((s) => (Array.isArray(s.key) ? s.key : [s.key]).includes(current as Step));
  return (
    <div className="space-y-3" aria-live="polite">
      {part && part.parts > 1 ? (
        <p className="text-muted text-sm">
          Part {part.part} of {part.parts}
        </p>
      ) : null}
      <ol className="space-y-2.5">
        {steps.map((s, i) => {
          const state = idx > i ? "done" : idx === i ? "active" : "todo";
          return (
            <li key={s.label} className="flex items-center gap-3 text-[15px]">
              <span
                aria-hidden
                className={cx(
                  "grid size-5 place-items-center rounded-full border text-[10px]",
                  state === "done" && "border-signal bg-signal text-white",
                  state === "active" && "border-signal",
                  state === "todo" && "border-line",
                )}
              >
                {state === "done" ? (
                  "✓"
                ) : state === "active" ? (
                  <span className="bg-signal size-1.5 animate-pulse rounded-full" />
                ) : null}
              </span>
              <span className={state === "todo" ? "text-muted" : "text-ink"}>
                {s.label}
                <span className="sr-only">
                  {state === "done" ? " (done)" : state === "active" ? " (in progress)" : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function FlowErrorNotice<T>({ flow, onRetry }: { flow: FlowState<T>; onRetry: () => void }) {
  if (flow.phase !== "error" || !flow.error) return null;
  return (
    <div className="space-y-3">
      <Notice tone="danger" title="Not completed">
        {flow.error}
      </Notice>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={onRetry}>
          Try again
        </Button>
        {flow.relayFailed ? (
          <Button variant="quiet" onClick={() => flow.run({ allowWalletSubmit: true })}>
            Submit from my wallet instead
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function TxLinks({ hashes }: { hashes: Hex[] }) {
  if (!hashes.length) return null;
  return (
    <ul className="space-y-1 text-sm">
      {hashes.map((h, i) => (
        <li key={h}>
          <ExternalLink href={txUrl(h)}>
            {hashes.length > 1 ? `Transaction ${i + 1}` : "View transaction"} · {h.slice(0, 10)}…
          </ExternalLink>
        </li>
      ))}
    </ul>
  );
}
