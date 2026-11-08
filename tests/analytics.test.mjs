// Click filtering + analytics aggregation (Phase 6 Slice A — pure).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCrawlerUserAgent, countClicks } from '../src/lib/click-filter.ts';
import { summarizeAnalytics } from '../src/lib/analytics.ts';

const META_CRAWLER = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36';
const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36';

test('the real observed UAs classify correctly', () => {
  // Observed live 2026-11-07 on the first publication: 7 crawler + 2 human.
  assert.equal(isCrawlerUserAgent(META_CRAWLER), true);
  assert.equal(isCrawlerUserAgent(CHROME_ANDROID), false);
  assert.equal(isCrawlerUserAgent(CHROME_WINDOWS), false);
  assert.deepEqual(countClicks([META_CRAWLER, META_CRAWLER, META_CRAWLER, META_CRAWLER, META_CRAWLER, META_CRAWLER, META_CRAWLER, CHROME_ANDROID, CHROME_WINDOWS]), {
    human: 2,
    crawler: 7,
    total: 9,
  });
});

test('missing or empty user agents are not human clicks', () => {
  assert.equal(isCrawlerUserAgent(null), true);
  assert.equal(isCrawlerUserAgent(''), true);
  assert.equal(isCrawlerUserAgent('   '), true);
});

test('common preview and bot agents are crawlers', () => {
  for (const ua of ['Twitterbot/1.0', 'LinkedInBot/1.0', 'WhatsApp/2.23', 'Slackbot-LinkExpanding', 'TelegramBot', 'curl/8.4.0', 'Mozilla/5.0 (compatible; Googlebot/2.1)']) {
    assert.equal(isCrawlerUserAgent(ua), true, ua);
  }
});

const NOW = new Date('2026-11-08T15:00:00Z');
const base = {
  publications: [
    { id: 'p1', campaign_id: 'c1', asset_id: 'a1', status: 'published', created_at: '2026-11-07T13:00:00Z' },
    { id: 'p2', campaign_id: 'c1', asset_id: 'a2', status: 'published', created_at: '2026-11-08T14:00:00Z' },
    { id: 'p3', campaign_id: 'c2', asset_id: 'a3', status: 'sent', created_at: '2026-11-08T14:00:00Z' },
  ],
  campaigns: [
    { id: 'c1', title: 'Proof — Nov 7', audience_id: 'aud1' },
    { id: 'c2', title: 'First campaign — Coaches', audience_id: 'aud1' },
  ],
  audiences: [{ id: 'aud1', name: 'Course creators' }],
  assets: [
    { id: 'a1', type: 'script', title: 'Short 1' },
    { id: 'a2', type: 'script', title: 'Short 1 (repost)' },
    { id: 'a3', type: 'social_post', title: 'Post 1' },
  ],
  clicks: [
    { publication_id: 'p1', user_agent: META_CRAWLER, clicked_at: '2026-11-07T13:05:00Z' },
    { publication_id: 'p1', user_agent: META_CRAWLER, clicked_at: '2026-11-07T13:06:00Z' },
    { publication_id: 'p1', user_agent: CHROME_WINDOWS, clicked_at: '2026-11-07T14:00:00Z' },
    { publication_id: 'p2', user_agent: CHROME_ANDROID, clicked_at: '2026-11-08T14:05:00Z' },
    { publication_id: 'p2', user_agent: CHROME_ANDROID, clicked_at: '2026-11-08T14:06:00Z' },
    { publication_id: 'p2', user_agent: META_CRAWLER, clicked_at: '2026-11-08T14:07:00Z' },
  ],
};

test('summarize: totals separate human from crawler and count live publications', () => {
  const summary = summarizeAnalytics({ ...base, window: 'all', now: NOW });
  assert.deepEqual(
    { human: summary.totals.human, crawler: summary.totals.crawler, publications: summary.totals.publications, live: summary.totals.livePublications },
    { human: 3, crawler: 3, publications: 3, live: 2 },
  );
});

test('summarize: groups roll up by campaign, audience and asset type', () => {
  const summary = summarizeAnalytics({ ...base, window: 'all', now: NOW });
  assert.equal(summary.perCampaign.length, 2);
  assert.equal(summary.perCampaign[0].label, 'Proof — Nov 7');
  assert.equal(summary.perCampaign[0].human, 3);
  assert.equal(summary.perAudience.length, 1);
  assert.equal(summary.perAudience[0].label, 'Course creators');
  assert.equal(summary.perAudience[0].publications, 3);
  const script = summary.perAssetType.find((g) => g.key === 'script');
  assert.equal(script?.human, 3);
  assert.equal(summary.bestPublication?.publicationId, 'p2');
});

test('summarize: the window filters old clicks out', () => {
  const summary = summarizeAnalytics({ ...base, window: '7d', now: new Date('2026-12-01T00:00:00Z') });
  assert.equal(summary.totals.total, 0);
  assert.equal(summary.bestPublication, null);
});
