// Learning loop signals (Phase 6 Slice C — pure).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractLearningSignals } from '../src/lib/learnings.ts';

const group = (key, label, publications, human) => ({ key, label, publications, human, crawler: 0, total: human });

test('below the evidence thresholds the loop stays silent', () => {
  const lines = extractLearningSignals({
    perAudience: [group('aud1', 'Course creators', 2, 4)], // 4 human clicks < 5
    perAssetType: [group('script', 'script', 1, 40)], // 1 publication < 2
    bestPublication: { assetTitle: 'Short 1', campaignTitle: 'Proof', human: 4 },
  });
  assert.deepEqual(lines, []);
});

test('qualifying groups produce plain-language signals ranked by rate', () => {
  const lines = extractLearningSignals({
    perAudience: [group('aud1', 'Course creators', 2, 12), group('aud2', 'Coaches', 4, 12)],
    perAssetType: [group('script', 'script', 3, 15), group('social_post', 'social_post', 2, 6)],
    bestPublication: { assetTitle: 'Short 1', campaignTitle: 'Proof — Nov 7', human: 9 },
  });
  assert.equal(lines.length, 3);
  assert.match(lines[0], /Course creators.*6 human clicks per publication/);
  assert.match(lines[1], /Avatar videos.*5 human clicks per publication/);
  assert.match(lines[2], /Short 1.*9 human clicks/);
});

test('a best asset under the click floor adds no line', () => {
  const lines = extractLearningSignals({
    perAudience: [],
    perAssetType: [],
    bestPublication: { assetTitle: 'Short 1', campaignTitle: null, human: 3 },
  });
  assert.deepEqual(lines, []);
});
