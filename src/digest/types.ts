import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Plan 2026-10-29 morning-digest, section 1. The reader turns a night's run log into one row
// per job, plus how many lines could not be read.

export type RunStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  first: string;
  last: string;
};

export type Night = {
  night: string;
  rows: DigestRow[];
  lines: number;
  badLines: number;
};

type LogLine = { at: string; job: string; status: RunStatus; owner?: string | null; error?: string };

function isRunStatus(v: unknown): v is RunStatus {
  return v === 'ok' || v === 'retry' || v === 'fail';
}

function isLogLine(v: unknown): v is LogLine {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.at === 'string' && typeof o.job === 'string' && isRunStatus(o.status);
}

// Read runs/<night>.jsonl into one row per job. A line that does not parse is counted, never
// thrown: the night still renders. A missing night returns null so the caller can answer 404.
export function readNight(runsDir: string, night: string): Night | null {
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }

  const lines = text.split('\n').filter((l) => l.trim() !== '');
  const byJob = new Map<string, LogLine[]>();
  let badLines = 0;

  for (const line of lines) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      badLines++;
      continue;
    }
    if (!isLogLine(parsed)) {
      badLines++;
      continue;
    }
    const list = byJob.get(parsed.job) ?? [];
    list.push(parsed);
    byJob.set(parsed.job, list);
  }

  const rows: DigestRow[] = [];
  for (const [job, entries] of byJob) {
    const sorted = [...entries].sort((a, b) => a.at.localeCompare(b.at));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (!first || !last) continue;
    let lastError: string | null = null;
    for (const e of sorted) if (e.error !== undefined) lastError = e.error;
    rows.push({
      job,
      owner: last.owner ?? null,
      runs: sorted.length,
      retries: sorted.filter((e) => e.status === 'retry').length,
      lastStatus: last.status,
      lastError,
      first: first.at,
      last: last.at,
    });
  }

  rows.sort((a, b) => a.job.localeCompare(b.job));
  return { night, rows, lines: lines.length, badLines };
}
