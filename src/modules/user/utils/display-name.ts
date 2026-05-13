/**
 * NFC normalization, trim, collapse whitespace, strip ASCII control characters.
 * Apply class-validator rules on the result (length, etc.).
 */
export function sanitizeDisplayName(raw: string): string {
  const collapsed = raw.normalize('NFC').trim().replace(/\s+/g, ' ');
  let out = '';
  for (const ch of collapsed) {
    const cp = ch.codePointAt(0)!;
    if (cp >= 0x20 && cp !== 0x7f) {
      out += ch;
    }
  }
  return out;
}
