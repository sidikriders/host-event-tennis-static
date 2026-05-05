import { describe, expect, it } from 'vitest';

import type { EventMatchRule } from '@/types';
import { hasUniformNonZeroPlayCounts, getSpreadDoubleSelection, validateMatchAgainstRules } from './matchGenerator';

function createRule(ruleType: EventMatchRule['ruleType'], participant1Id: string, participant2Id: string): EventMatchRule {
  return {
    id: `${ruleType}:${participant1Id}:${participant2Id}`,
    clubId: 'club-1',
    eventId: 'event-1',
    ruleType,
    participant1Id,
    participant2Id,
    createdById: 'user-1',
    createdAt: '2026-05-05T00:00:00.000Z',
  };
}

describe('hasUniformNonZeroPlayCounts', () => {
  it('returns true only when every present player has the same non-zero count', () => {
    const playCounts = { p1: 1, p2: 1, p3: 1, p4: 1 };

    expect(hasUniformNonZeroPlayCounts(['p1', 'p2', 'p3', 'p4'], playCounts)).toBe(true);
  });

  it('returns false when any player has not played yet or when counts differ', () => {
    const zeroCounts = { p1: 1, p2: 1, p3: 0, p4: 1 };
    const mixedCounts = { p1: 1, p2: 2, p3: 1, p4: 1 };

    expect(hasUniformNonZeroPlayCounts(['p1', 'p2', 'p3', 'p4'], zeroCounts)).toBe(false);
    expect(hasUniformNonZeroPlayCounts(['p1', 'p2', 'p3', 'p4'], mixedCounts)).toBe(false);
  });
});

describe('getSpreadDoubleSelection', () => {
  it.each([
    {
      label: '8 players on round 3',
      playerIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'],
      round: 3,
      groupCount: 2,
      expected: ['p1', 'p2', 'p5', 'p6'],
    },
    {
      label: '12 players on round 5',
      playerIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12'],
      round: 5,
      groupCount: 3,
      expected: ['p3', 'p4', 'p7', 'p8'],
    },
    {
      label: '16 players on round 7',
      playerIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13', 'p14', 'p15', 'p16'],
      round: 7,
      groupCount: 4,
      expected: ['p5', 'p6', 'p9', 'p10'],
    },
  ])('$label', ({ playerIds, round, groupCount, expected }) => {
    expect(getSpreadDoubleSelection(playerIds, round, groupCount)).toEqual(expected);
  });

  it('returns null when there are fewer than four pair buckets', () => {
    expect(getSpreadDoubleSelection(['p1', 'p2', 'p3', 'p4', 'p5', 'p6'], 3, 2)).toBeNull();
  });
});

describe('validateMatchAgainstRules', () => {
  it('rejects teammate, opponent, and same-match violations', () => {
    const teammateRule = createRule('avoid_teammate', 'p1', 'p2');
    const opponentRule = createRule('avoid_opponent', 'p3', 'p4');
    const sameMatchRule = createRule('avoid_same_match', 'p5', 'p6');

    expect(validateMatchAgainstRules(['p1', 'p2'], ['p3', 'p4'], [teammateRule])).toMatchObject({
      message: 'Selected players include a pair that must not be on the same team.',
    });

    expect(validateMatchAgainstRules(['p3', 'p5'], ['p4', 'p6'], [opponentRule])).toMatchObject({
      message: 'Selected players include a pair that must not face each other.',
    });

    expect(validateMatchAgainstRules(['p5', 'p7'], ['p6', 'p8'], [sameMatchRule])).toMatchObject({
      message: 'Selected players include a pair that must not appear in the same match.',
    });
  });

  it('returns null when a selection does not violate any rule', () => {
    const rules = [
      createRule('avoid_teammate', 'p1', 'p2'),
      createRule('avoid_opponent', 'p3', 'p4'),
      createRule('avoid_same_match', 'p5', 'p6'),
    ];

    expect(validateMatchAgainstRules(['p1', 'p3'], ['p5', 'p7'], rules)).toBeNull();
  });
});