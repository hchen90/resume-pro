"use client";

import { useState } from "react";

import type { JobDescription } from "@/lib/job-descriptions/types";
import type { Locale } from "@/lib/i18n";
import type { Resume } from "@/lib/resume/types";

type JobMatchResult = {
  score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  suggestions: string[];
};

type JobMatchToolProps = {
  jobDescriptions: JobDescription[];
  resumes: Resume[];
  locale: Locale;
  labels: {
    selectJd: string;
    selectResume: string;
    runJobMatch: string;
    aiSending: string;
    aiError: string;
    score: string;
    summary: string;
    strengths: string;
    gaps: string;
    suggestions: string;
    needData: string;
  };
};

export function JobMatchTool({
  jobDescriptions,
  resumes,
  locale,
  labels,
}: JobMatchToolProps) {
  const [jobDescriptionId, setJobDescriptionId] = useState(
    jobDescriptions[0]?.id ?? "",
  );
  const [resumeId, setResumeId] = useState(resumes[0]?.id ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<JobMatchResult | null>(null);

  async function runMatch() {
    if (!jobDescriptionId || !resumeId || isLoading) {
      return;
    }

    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/job-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescriptionId,
          resumeId,
          locale,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const payload = (await response.json()) as {
        result?: JobMatchResult;
        message?: string;
      };

      if (!payload.result) {
        throw new Error(payload.message ?? labels.aiError);
      }

      setResult(payload.result);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? `${labels.aiError}: ${caughtError.message}`
          : labels.aiError,
      );
    } finally {
      setIsLoading(false);
    }
  }

  const canRun = jobDescriptions.length > 0 && resumes.length > 0;

  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
      {!canRun ? (
        <div className="rounded-lg border border-dashed border-[var(--app-border)] bg-[var(--app-muted-surface)] p-6 text-center text-sm text-[var(--app-muted)]">
          {labels.needData}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-[var(--app-muted)]">
              {labels.selectJd}
              <select
                value={jobDescriptionId}
                onChange={(event) => setJobDescriptionId(event.target.value)}
                className="mt-2 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
              >
                {jobDescriptions.map((jobDescription) => (
                  <option key={jobDescription.id} value={jobDescription.id}>
                    {jobDescription.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-[var(--app-muted)]">
              {labels.selectResume}
              <select
                value={resumeId}
                onChange={(event) => setResumeId(event.target.value)}
                className="mt-2 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
              >
                {resumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={() => void runMatch()}
            disabled={isLoading}
            className="mt-4 rounded-lg bg-[var(--app-primary)] px-5 py-3 font-semibold text-white transition hover:bg-[var(--app-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? labels.aiSending : labels.runJobMatch}
          </button>

          {error ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {result ? (
            <div className="mt-6 space-y-5">
              <div className="rounded-xl bg-[var(--app-accent-soft)] p-5 ring-1 ring-[var(--app-accent-border)]">
                <p className="text-sm font-semibold text-[var(--app-accent)]">
                  {labels.score}
                </p>
                <p className="mt-2 text-5xl font-bold text-[var(--app-text)]">
                  {result.score.toFixed(1)}
                  <span className="text-xl text-[var(--app-muted)]"> / 10.0</span>
                </p>
              </div>

              <ResultSection title={labels.summary} items={[result.summary]} />
              <ResultSection title={labels.strengths} items={result.strengths} />
              <ResultSection title={labels.gaps} items={result.gaps} />
              <ResultSection title={labels.suggestions} items={result.suggestions} />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function ResultSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--app-muted)]">
        {title}
      </h3>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--app-text)]">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-lg border border-[var(--app-border)] bg-[var(--app-muted-surface)] px-4 py-3"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
