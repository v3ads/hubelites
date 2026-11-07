// Spoken-script sanitizer (pure — no imports, unit-tested).
//
// Campaign script assets are stored in a labeled production format
// ("Hook: …", "B-roll: …", "[cut to …]") written for humans producing a
// video by hand. An avatar TTS engine reads whatever it is given —
// including the labels — so before a script is sent to HeyGen it is
// converted here into exactly what the avatar should say:
//
//   - section labels whose text IS speech ("Hook:", "CTA:") lose the
//     label but keep the sentence;
//   - direction labels ("B-roll:", "Visual:", "On-screen text:", …)
//     lose the whole line — their content is never spoken;
//   - [bracketed] and (parenthesized) stage directions are removed;
//   - markdown (headings, bold/italic, bullets, numbering) is stripped;
//   - raw URLs are dropped (an avatar must never spell out a link);
//   - emoji and stray symbols are removed;
//   - the result is capped at ~60 seconds of speech on a sentence edge.
//
// What survives is preserved verbatim: ordinary sentences pass through
// untouched apart from whitespace normalization.

export const SPOKEN_SCRIPT_MAX_CHARS = 900;

// Labels whose following text is meant to be spoken.
const SPEAK_LABELS = [
  'hook',
  'cta',
  'call to action',
  'intro',
  'outro',
  'opening',
  'closing',
  'script',
  'voiceover',
  'voice over',
  'vo',
  'narration',
  'narrator',
  'presenter',
  'host',
  'avatar',
  'line',
  'dialogue',
];

// Labels whose content is production direction — never spoken.
const DROP_LABELS = [
  'b-roll',
  'broll',
  'visual',
  'visuals',
  'on-screen text',
  'on screen text',
  'onscreen text',
  'text overlay',
  'overlay',
  'caption',
  'captions',
  'subtitle',
  'subtitles',
  'music',
  'sfx',
  'sound',
  'sound effect',
  'direction',
  'directions',
  'stage direction',
  'note',
  'notes',
  'production',
  'camera',
  'edit',
  'transition',
];

const LABEL_RE = /^([^:]{1,40}):\s*(.*)$/;

function normalizeLabel(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[[\]()#>*_`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s*\d+$/, '')
    .trim();
}

function isSceneLabel(label: string): boolean {
  return /^(scene|shot|part|segment)\s*\d*$/.test(label);
}

/** Remove markdown emphasis markers while keeping the words. */
function stripMarkdownInline(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|\W)\*([^*\n]+)\*/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1');
}

/** Drop raw URLs (and a dangling "at/on/via" right before one). */
function dropUrls(text: string): string {
  return text
    .replace(/\b(?:at|on|via)\s+(?:https?:\/\/|www\.)[^\s)]+/gi, '')
    .replace(/(?:https?:\/\/|www\.)[^\s)]+/gi, '')
    .replace(/\b[\w-]+(?:\.[\w-]+)*\.(?:com|io|ai|net|org|co|app|dev|me|tv)(?:\/[^\s)]*)?/gi, '');
}

function dropBracketed(text: string): string {
  return text.replace(/\[[^\]]*\]/g, ' ').replace(/\([^)]*\)/g, ' ');
}

function dropEmoji(text: string): string {
  return text.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, ' ');
}

/** Convert one raw line into zero or more spoken fragments. */
function spokenFragmentsForLine(rawLine: string): string[] {
  let line = rawLine.trim();
  if (!line) return [];

  // Markdown headings and blockquotes are structure, not speech; strip
  // the markers, then let the label rules below judge the text.
  line = line.replace(/^#{1,6}\s+/, '').replace(/^>\s?/, '');
  // Bullets and numbered items keep their text.
  line = line.replace(/^[-*•]\s+/, '').replace(/^\d{1,3}[.)]\s+/, '');
  line = stripMarkdownInline(line).trim();
  if (!line) return [];

  // A bare label standing alone as a heading ("CTA", "## Hook",
  // "Scene 2") names a section — it is not itself speech.
  const bareLabel = normalizeLabel(line);
  if (SPEAK_LABELS.includes(bareLabel) || DROP_LABELS.includes(bareLabel) || isSceneLabel(bareLabel)) {
    return [];
  }

  const labelMatch = line.match(LABEL_RE);
  if (labelMatch) {
    const label = normalizeLabel(labelMatch[1]);
    const rest = (labelMatch[2] ?? '').trim();
    if (DROP_LABELS.includes(label)) return [];
    if (SPEAK_LABELS.includes(label) || isSceneLabel(label)) {
      // A bare label with no text carries nothing to say.
      if (!rest) return [];
      line = rest;
    }
    // Anything else with a colon (e.g. "Subject:" in prose, times like
    // "9:30") is left alone — it reads as ordinary text.
  }

  line = dropBracketed(line);
  line = dropUrls(line);
  line = dropEmoji(line);
  line = stripMarkdownInline(line);
  return [line];
}

export function toSpokenScript(body: string, maxChars: number = SPOKEN_SCRIPT_MAX_CHARS): string {
  const fragments: string[] = [];
  for (const rawLine of (body ?? '').split(/\r?\n/)) {
    fragments.push(...spokenFragmentsForLine(rawLine));
  }
  let clean = fragments
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/([.!?])\s*([.!?])+/g, '$1')
    .trim();
  // A fragment that lost its content to URL/bracket removal can leave a
  // lone punctuation mark behind; drop orphaned fragments.
  clean = clean
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => /[\p{L}\p{N}]/u.test(sentence))
    .join(' ')
    .trim();
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, maxChars);
  const lastSentence = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return (lastSentence > 300 ? cut.slice(0, lastSentence + 1) : cut).trim();
}
