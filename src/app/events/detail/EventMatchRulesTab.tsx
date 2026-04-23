'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { EventMatchRule, EventMatchRuleType, Participant } from '@/types';
import { deleteEventMatchRule, getEventMatchRules, saveEventMatchRule } from '@/lib/storage';

interface EventMatchRulesTabProps {
  eventId: string;
  clubId: string;
  participants: Participant[];
  canOperateEvent: boolean;
  isActive: boolean;
  currentUserId: string | null;
}

type RuleOption = {
  value: EventMatchRuleType;
  label: string;
  description: string;
};

const RULE_OPTIONS: RuleOption[] = [
  {
    value: 'avoid_teammate',
    label: 'Do not pair together',
    description: 'These players should not be on the same team.',
  },
  {
    value: 'avoid_opponent',
    label: 'Do not face each other',
    description: 'These players should not be opponents in one match.',
  },
  {
    value: 'avoid_same_match',
    label: 'Do not share a match',
    description: 'These players should not appear in the same match at all.',
  },
];

function getRuleMeta(ruleType: EventMatchRuleType) {
  return RULE_OPTIONS.find((option) => option.value === ruleType) ?? RULE_OPTIONS[0];
}

export default function EventMatchRulesTab({
  eventId,
  clubId,
  participants,
  canOperateEvent,
  isActive,
  currentUserId,
}: EventMatchRulesTabProps) {
  const [rules, setRules] = useState<EventMatchRule[]>([]);
  const [participant1Id, setParticipant1Id] = useState('');
  const [participant2Id, setParticipant2Id] = useState('');
  const [ruleType, setRuleType] = useState<EventMatchRuleType>('avoid_teammate');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedParticipants = useMemo(
    () => [...participants].sort((left, right) => left.name.localeCompare(right.name)),
    [participants]
  );

  const participantsById = useMemo(
    () => new Map(sortedParticipants.map((participant) => [participant.id, participant])),
    [sortedParticipants]
  );

  const loadRules = useCallback(async () => {
    if (!canOperateEvent) {
      return;
    }

    setLoading(true);

    try {
      setError(null);
      const nextRules = await getEventMatchRules(eventId);
      setRules(nextRules);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load match rules.');
    } finally {
      setLoading(false);
    }
  }, [canOperateEvent, eventId]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  useEffect(() => {
    if (!participant1Id && sortedParticipants.length > 0) {
      setParticipant1Id(sortedParticipants[0].id);
    }
  }, [participant1Id, sortedParticipants]);

  useEffect(() => {
    if (participant2Id === participant1Id) {
      setParticipant2Id('');
    }
  }, [participant1Id, participant2Id]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canOperateEvent || !currentUserId) {
      return;
    }

    if (!participant1Id || !participant2Id) {
      setError('Pick two participants first.');
      return;
    }

    if (participant1Id === participant2Id) {
      setError('Pick two different participants.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const nextRule: EventMatchRule = {
        id: uuidv4(),
        clubId,
        eventId,
        ruleType,
        participant1Id,
        participant2Id,
        createdById: currentUserId,
        createdAt: new Date().toISOString(),
      };

      await saveEventMatchRule(nextRule);
      await loadRules();
      setParticipant2Id('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save match rule.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!canOperateEvent) {
      return;
    }

    if (!confirm('Delete this match rule?')) {
      return;
    }

    try {
      setError(null);
      await deleteEventMatchRule(ruleId);
      setRules((currentRules) => currentRules.filter((rule) => rule.id !== ruleId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete match rule.');
    }
  };

  const availableSecondParticipants = sortedParticipants.filter(
    (participant) => participant.id !== participant1Id
  );

  if (!isActive) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
        <h2 className="text-lg font-bold text-gray-900">Match Rules</h2>
        <p className="mt-1 text-sm text-gray-600">
          Add event-specific pairing restrictions for members, admins, and owners. These rules will be
          used later by match generation and custom match validation.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Add Rule</h3>
            <p className="mt-1 text-sm text-gray-500">
              Save a restriction between two participants in this event.
            </p>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
            {rules.length} rule{rules.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Rule type</label>
            <select
              value={ruleType}
              onChange={(event) => setRuleType(event.target.value as EventMatchRuleType)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              {RULE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">{getRuleMeta(ruleType).description}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Participant 1</label>
            <select
              value={participant1Id}
              onChange={(event) => setParticipant1Id(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
              disabled={sortedParticipants.length === 0}
            >
              {sortedParticipants.length === 0 ? (
                <option value="">No participants</option>
              ) : (
                sortedParticipants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Participant 2</label>
            <select
              value={participant2Id}
              onChange={(event) => setParticipant2Id(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
              disabled={availableSecondParticipants.length === 0}
            >
              <option value="">Select participant</option>
              {availableSecondParticipants.map((participant) => (
                <option key={participant.id} value={participant.id}>
                  {participant.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving || sortedParticipants.length < 2}
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-400"
          >
            {saving ? 'Saving...' : 'Save Rule'}
          </button>
          <div className="rounded-xl bg-gray-100 px-4 py-2 text-sm text-gray-500">
            Need at least 2 participants in this event.
          </div>
        </div>
      </form>

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
            Loading match rules...
          </div>
        ) : rules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
            No rules yet. Add the first restriction above.
          </div>
        ) : (
          rules.map((rule) => {
            const participant1 = participantsById.get(rule.participant1Id);
            const participant2 = participantsById.get(rule.participant2Id);
            const ruleMeta = getRuleMeta(rule.ruleType);

            return (
              <div
                key={rule.id}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        {ruleMeta.label}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {participant1?.name ?? 'Unknown player'}
                      </span>
                      <span className="text-sm text-gray-400">and</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {participant2?.name ?? 'Unknown player'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">{ruleMeta.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(rule.id)}
                    className="rounded-lg px-3 py-1.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}