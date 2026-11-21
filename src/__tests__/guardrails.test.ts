// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (f === 'node_modules' || f === '__tests__' || f === 'tests') continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|css|sql|html|md)$/.test(f) && !/\.test\./.test(f)) out.push(p);
  }
  return out;
}
const files = [...walk('src'), ...walk('supabase'), 'index.html'];
const text = (f: string) => readFileSync(f, 'utf8');

describe('wording and scope guardrails', () => {
  it('never uses misleading phrases for simulated values', () => {
    const banned = /live market|real[- ]time price|official price|\blive price|\bliv(e)?\b ?(chart|data)/i;
    const hits = files.filter((f) => banned.test(text(f)));
    expect(hits).toEqual([]);
  });
  it('contains no payment, deposit, withdrawal or cash-conversion code', () => {
    const banned = /stripe|paypal|checkout|payout|cash[- ]?out|\bcrypto|withdraw\(|deposit\(|create_?payment|payment_intent/i;
    const hits = files.filter((f) => banned.test(text(f)));
    expect(hits).toEqual([]);
  });
  it('never references the service role key from frontend code', () => {
    const hits = walk('src').filter((f) => /service_role|SERVICE_ROLE/.test(text(f)));
    expect(hits).toEqual([]);
  });
});
