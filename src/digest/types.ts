import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Plan 2026-10-29 morning-digest, section 1. The reader types every other part of section 2
// starts against: one row per job, plus how many lines could not be read.

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

// Signature only for now; the body lands with the reader issue. A missing night returns null
// so the caller can answer 404.
export function readNight(runsDir: string, night: string): Night | null {
  void readFileSync;
  void join;
  void runsDir;
  void night;
  throw new Error('readNight: not implemented yet');
}
