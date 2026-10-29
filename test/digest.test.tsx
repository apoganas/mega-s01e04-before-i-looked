import { copyFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

// Plan morning-digest § 2d: routes from a temp runs dir; runs/ itself is read-only.
const dir = mkdtempSync(join(tmpdir(), 'rig-routes-'));
const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: dir };
const app = createApp(config);

copyFileSync(join(__dirname, '..', 'runs', '2026-10-28.jsonl'), join(dir, '2026-10-28.jsonl'));
writeFileSync(join(dir, '2026-10-26.jsonl'), '');

describe('digest page (2a)', () => {
  it('renders the night at /digest/2026-10-28', async () => {
    const res = await app.request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('digest · 2026-10-28');
    expect(html).toContain('fixtures/refresh');
    expect(html).toContain('digest/render');
  });

  it('marks a fail and a night with a bad line', async () => {
    const res = await app.request('/digest/2026-10-28');
    const html = await res.text();
    expect(html).toContain('fail');
    expect(html).toMatch(/1 line did not parse/);
  });

  it('answers 404 for a night with no file', async () => {
    expect((await app.request('/digest/2026-01-01')).status).toBe(404);
  });

  it('renders an empty night as "nothing ran"', async () => {
    const res = await app.request('/digest/2026-10-26');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
  });
});

describe('digest JSON (2b)', () => {
  it('answers 404 for a night with no file', async () => {
    expect((await app.request('/api/digest/2026-01-01')).status).toBe(404);
  });

  it('agrees with the page: same jobs, same order', async () => {
    const page = await (await app.request('/digest/2026-10-28')).text();
    const json = (await (await app.request('/api/digest/2026-10-28')).json()) as {
      rows: { job: string }[];
      badLines: number;
    };
    const jobs = json.rows.map((r) => r.job);
    expect(jobs).toEqual(['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs']);
    for (const job of jobs) expect(page).toContain(job);
    expect(json.rows).toHaveLength(5);
    expect(json.badLines).toBe(1);
  });
});

describe('board link (2c)', () => {
  it('links each night to its digest', async () => {
    const html = await (await app.request('/')).text();
    expect(html).toContain('href="/digest/2026-10-28"');
    expect(html).toContain('href="/digest/2026-10-26"');
  });
});
