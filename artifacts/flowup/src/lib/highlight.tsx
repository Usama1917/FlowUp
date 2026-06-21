import type { ReactNode } from 'react';

// Wrap every case-insensitive occurrence of `term` inside `text` in a <mark>.
// Returns the plain string when there's no term or no match, so it's safe to
// drop into any text slot. Used by the room list previews and chat bubbles.
export function highlightText(text: string, term?: string): ReactNode {
  const q = (term ?? '').trim().toLowerCase();
  if (!q) return text;
  const lower = text.toLowerCase();
  if (!lower.includes(q)) return text;

  const parts: ReactNode[] = [];
  let i = 0;
  let key = 0;
  let idx = lower.indexOf(q);
  while (idx !== -1) {
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark key={key++} className="bg-amber-300/70 dark:bg-amber-500/40 text-inherit rounded-[3px] px-0.5">
        {text.slice(idx, idx + q.length)}
      </mark>
    );
    i = idx + q.length;
    idx = lower.indexOf(q, i);
  }
  if (i < text.length) parts.push(text.slice(i));
  return parts;
}
