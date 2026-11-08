// Click classification for tracked links (Phase 6, Slice A).
//
// Every hit on /r/<slug> is recorded with its user_agent. A large share of
// those hits are NOT people: the social platforms fetch the link to build
// their preview cards (Meta's facebookexternalhit alone fetched the first
// publication's link 7 times in its first hour), plus search crawlers,
// chat-app preview bots and uptime monitors. Counting them as "clicks"
// lies to the ambassador, so clicks are classified:
//
//   human   — a real browser user agent
//   crawler — a known fetcher/bot signature, or no user agent at all
//
// The raw rows are never altered; both numbers are always available and
// the UI shows them side by side ("9 clicks · 2 human" is presented as
// 2 clicks with a "7 platform previews & bots" note) — filtering decides
// what the headline number means, it never hides that filtering happened.

// Curated fetcher/bot signatures (matched case-insensitively as
// substrings). Keep this list to agents that are never a person's
// browser; generic "bot" matching is deliberately NOT used (some real
// device user agents contain lookalike tokens).
const CRAWLER_SIGNATURES = [
  'facebookexternalhit',
  'facebookcatalog',
  'meta-externalagent',
  'meta-externalfetcher',
  'twitterbot',
  'linkedinbot',
  'slackbot',
  'slack-imgproxy',
  'whatsapp',
  'telegrambot',
  'discordbot',
  'skypeuripreview',
  'redditbot',
  'pinterestbot',
  'googlebot',
  'google-inspectiontool',
  'bingbot',
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'applebot',
  'bytespider',
  'bytedance',
  'tiktokbot',
  'embedly',
  'quora link preview',
  'vkshare',
  'w3c_validator',
  'headlesschrome',
  'phantomjs',
  'lighthouse',
  'pingdom',
  'uptimerobot',
  'statuscake',
  'betteruptime',
  'curl/',
  'wget/',
  'python-requests',
  'python-httpx',
  'python-urllib',
  'axios/',
  'node-fetch',
  'go-http-client',
  'okhttp',
  'java/',
  'libwww-perl',
  'semrushbot',
  'ahrefsbot',
  'mj12bot',
  'dotbot',
  'petalbot',
  'dataforseobot',
  'gptbot',
  'claudebot',
  'perplexitybot',
  'amazonbot',
] as const;

export function isCrawlerUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent || userAgent.trim().length === 0) return true; // no UA = not a browser
  const ua = userAgent.toLowerCase();
  return CRAWLER_SIGNATURES.some((signature) => ua.includes(signature));
}

export type ClickCounts = { human: number; crawler: number; total: number };

export function countClicks(userAgents: Array<string | null | undefined>): ClickCounts {
  let crawler = 0;
  for (const ua of userAgents) {
    if (isCrawlerUserAgent(ua)) crawler += 1;
  }
  return { human: userAgents.length - crawler, crawler, total: userAgents.length };
}
