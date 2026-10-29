import { copyFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/types.js';

// Plan morning-digest § 1. runs/ is read-only, so read it from a temp copy.
const dir = mkdtempSync(join(tmpdir(), 'rig-reader-'));
copyFileSync(join(__dirname, '..', 'runs', '2026-10-28.jsonl'), join(dir, '2026-10-28.jsonl'));
writeFileSync(join(dir, '2026-10-26.jsonl'), '');

describe('readNight', () => {
  it('reads 2026-10-28 into 5 jobs and counts the bad line', () => {
    const night = readNight(dir, '2026-10-28');
    expect(night).not.toBeNull();
    expect(night?.rows).toHaveLength(5);
    expect(night?.badLines).toBe(1);
    expect(night?.lines).toBe(16);
  });

  it('keeps a null owner and aggregates retries and the last error', () => {
    const night = readNight(dir, '2026-10-28');
    const render = night?.rows.find((r) => r.job === 'digest/render');
    expect(render?.owner).toBeNull();

    const fixtures = night?.rows.find((r) => r.job === 'fixtures/refresh');
    expect(fixtures?.runs).toBe(4);
    expect(fixtures?.retries).toBe(3);
    expect(fixtures?.lastStatus).toBe('ok');
    expect(fixtures?.lastError).toBe('upstream 503');

    const backup = night?.rows.find((r) => r.job === 'notes/backup');
    expect(backup?.lastStatus).toBe('fail');
  });

  it('returns null for a night with no file', () => {
    expect(readNight(dir, '2026-01-01')).toBeNull();
  });

  it('returns no rows for an empty night', () => {
    const night = readNight(dir, '2026-10-26');
    expect(night?.rows).toHaveLength(0);
    expect(night?.lines).toBe(0);
    expect(night?.badLines).toBe(0);
  });
});
