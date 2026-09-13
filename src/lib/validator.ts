import type { Lesson } from '../data/lessons';

export interface ValidationResult {
  pass: boolean;
  partial: number; // 0..1
  reason: string;
}

function normCmd(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

/** Deep-compare a subset of VFS snapshot against expected fsState. */
function matchFs(actual: unknown, expected: unknown): boolean {
  if (typeof expected === 'string') return actual === expected;
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    if (!actual || typeof actual !== 'object') return false;
    for (const [k, v] of Object.entries(expected as Record<string, unknown>)) {
      if (!(k in (actual as Record<string, unknown>))) return false;
      if (!matchFs((actual as Record<string, unknown>)[k], v)) return false;
    }
    return true;
  }
  return actual === expected;
}

export function validate(
  lesson: Lesson,
  lastCommand: string,
  outputBuffer: string,
  fsSnapshot: Record<string, unknown>,
): ValidationResult {
  const exp = lesson.expected;
  const reasons: string[] = [];
  let checks = 0;
  let passed = 0;

  if (exp.command) {
    checks++;
    const got = normCmd(lastCommand);
    const want = normCmd(exp.command);
    if (got === want) {
      passed++;
    } else if (exp.commandAlt?.map(normCmd).includes(got)) {
      passed++;
    } else {
      // Partial credit: token overlap (e.g. ls -a vs ls -la)
      const gotT = new Set(got.split(' '));
      const wantT = want.split(' ');
      const hit = wantT.filter((t) => gotT.has(t)).length / wantT.length;
      if (hit >= 0.5) {
        return { pass: false, partial: Math.max(0.4, hit * 0.8), reason: `Close! You ran \`${got}\`. Expected \`${want}\`.` };
      }
      reasons.push(`Run \`${want}\` (you ran \`${got || '(nothing)'}\`)`);
    }
  }

  if (exp.output) {
    checks++;
    if (outputBuffer.includes(exp.output)) passed++;
    else if (exp.outputAlt?.some((a) => outputBuffer.includes(a))) passed++;
    else reasons.push(`Output should contain \`${exp.output}\``);
  }

  if (exp.fsState) {
    checks++;
    if (matchFs(fsSnapshot, exp.fsState)) passed++;
    else reasons.push('Filesystem state does not match yet');
  }

  if (checks === 0) return { pass: true, partial: 1, reason: 'No checks defined' };
  if (passed === checks) return { pass: true, partial: 1, reason: 'All checks passed' };
  const partial = passed / checks;
  return { pass: false, partial, reason: reasons.join(' • ') || 'Not quite yet' };
}
