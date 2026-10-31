"use client";

import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps, type ReactNode } from "react";
import { IconArrowRight } from "./icons";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "dark" | "ghost" | "quiet" | "danger";

const base = "min-h-11 px-5 text-[15px]";

// Primary actions share the website's accent; secondary actions stay quiet.
const variants: Record<Variant, string> = {
  primary: "btn btn-accent",
  dark: "btn btn-dark",
  ghost: "btn btn-light",
  quiet: "inline-flex items-center justify-center gap-2 rounded-full px-3 font-medium text-ink-2 hover:text-ink",
  danger: "btn btn-light text-danger!",
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }>(
  function Button({ variant = "primary", className, type = "button", ...rest }, ref) {
    return <button ref={ref} type={type} className={cx(base, variants[variant], className)} {...rest} />;
  },
);

export function ButtonLink({
  variant = "primary",
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cx(base, variants[variant], className)} {...rest} />;
}

export function Card({
  className,
  children,
  as: As = "section",
  ...rest
}: { className?: string; children: ReactNode; as?: "section" | "div" | "article" } & Record<string, unknown>) {
  return (
    <As className={cx("border-line bg-surface rounded-[18px] border p-5 sm:p-6", className)} {...rest}>
      {children}
    </As>
  );
}

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "signal" | "danger";
  className?: string;
}) {
  const tones = {
    neutral: "border-line bg-surface text-ink-2",
    signal: "border-transparent bg-signal-tint text-signal-text",
    danger: "border-danger/40 bg-danger-tint text-danger",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SignalDot({ className }: { className?: string }) {
  return <span aria-hidden className={cx("bg-signal inline-block size-1.5 rounded-full", className)} />;
}

/** Hidden balances are a short row of dots: never blur or black bars. */
export function HiddenDots({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-[0.18em] align-middle", className)} aria-label="Hidden">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} aria-hidden className="inline-block size-[0.16em] min-h-1.5 min-w-1.5 rounded-full bg-current" />
      ))}
    </span>
  );
}

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-muted text-sm">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass =
  "w-full min-h-12 rounded-[14px] border border-line-strong bg-surface px-4 text-base text-ink placeholder:text-muted outline-none transition-[border-color,box-shadow] duration-150 focus:border-signal focus:shadow-[0_0_0_3px_var(--signal-tint)] aria-[invalid=true]:border-danger";

export function PageHeader({
  title,
  description,
  back = "/app",
}: {
  title: string;
  description?: ReactNode;
  back?: string | null;
}) {
  return (
    <header className="mb-6 space-y-2">
      {back ? (
        <Link href={back} className="text-ink-2 hover:text-ink inline-flex min-h-11 items-center gap-1.5 text-sm">
          <IconArrowRight className="size-4 rotate-180" /> Back
        </Link>
      ) : null}
      <h1 className="text-[30px] leading-[1.1] font-light tracking-[-0.02em] sm:text-[34px]">{title}</h1>
      {description ? <p className="text-ink-2 max-w-prose text-[15px] leading-relaxed">{description}</p> : null}
    </header>
  );
}

export function Notice({
  tone = "neutral",
  title,
  children,
}: {
  tone?: "neutral" | "signal" | "danger";
  title?: string;
  children: ReactNode;
}) {
  const tones = {
    neutral: "border-line bg-surface-2",
    signal: "border-transparent bg-signal-tint",
    danger: "border-danger/30 bg-danger-tint",
  };
  return (
    <div role={tone === "danger" ? "alert" : undefined} className={cx("rounded-2xl border p-4 text-sm", tones[tone])}>
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      <div className="text-ink-2 [&_strong]:text-ink leading-relaxed [&_strong]:font-medium">{children}</div>
    </div>
  );
}

export function ExternalLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      referrerPolicy="no-referrer"
      className={cx("decoration-line hover:decoration-ink underline underline-offset-4", className)}
    >
      {children}
    </a>
  );
}
