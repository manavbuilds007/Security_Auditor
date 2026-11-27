# Prompt Log

## 1. Initial prompt (summary)

Plan and build a 100% client-side PII Data Sanitization Tool in Vite + React + TypeScript + Tailwind (no SSR)
for GitHub + Vercel static deployment, with the badge "100% Client-Side • Zero Server Transmission",
`lucide-react` icons, a pure detection engine (`src/utils/piiEngine.ts`) with Vitest tests, three redaction
modes, side-by-side diff, category filters, audit counts, export, `PROMPT_LOG.md` and `vercel.json`.
Phase 1 was plan-only: stop and wait for approval before creating files or running install/build.

## 2. Plan and approval

The workspace was empty (Node 24, npm 11, git present; `gh` and `vercel` CLIs absent). A plan was written
and approved before any files were created.

## 3. Implementation decisions

- **Engine is pure TypeScript** (no DOM) so it is unit-testable in Node.
- **Overlap resolution:** precedence first (CARD > AADHAAR > PAN > EMAIL > IPV6 > IPV4 > PHONE), then
  length, then position. Numeric patterns use lookarounds that refuse to match next to `@`, `.`, word
  characters, or adjacent digit groups, so digits are never carved out of emails or longer numbers.
- **Rejections:** non-Luhn 13–19 digit candidates (and Verhoeff failures when enabled) are recorded, shown
  with a dashed amber underline, counted, and left unchanged. Rejections overlapped by an accepted match are dropped.
- **IPv6:** a loose candidate regex followed by structural validation, so timestamps (`10:42:13`) and
  `std::vector` are not matched.
- **Pseudonyms:** fresh `Map` per run, keyed by normalized value (lower-cased email, digits-only
  card/Aadhaar, national number for phones, expanded IPv6). IPv4 and IPv6 share the `IP_` counter.
- **Category filters:** disabled categories still claim their span (so they are not re-detected as something
  else) and are counted, but are not replaced.
- **CSV:** deviation from the plan: no cell-level tokenizer is needed. Patterns cannot cross delimiters or
  line breaks and replacements contain none, so structure is preserved by construction.
  `src/utils/csv.ts` only detects the delimiter, describes rows/columns, and verifies the structure
  skeleton is unchanged. Line endings: textarea normalizes to LF, so the original ending is restored on edit.
- **Privacy:** CSP `connect-src 'none'` in `index.html` and `vercel.json`; no external fonts or scripts.
- Synthetic sample data only (public test card numbers, made-up identifiers).

## 4. Verification

Results of `npx vitest run`, `tsc --noEmit` and `npm run build` are recorded in the final hand-off message.
