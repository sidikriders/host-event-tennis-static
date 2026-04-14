'use client';

import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { Participant } from '@/types';

type ParticipantOriginValue = NonNullable<Participant['origin']> | '';

interface PlayerFormProps {
  title: string;
  submitLabel: string;
  initialParticipant?: Participant | null;
  submitDisabled?: boolean;
  onSubmit: (participant: Participant) => void | Promise<void>;
  onCancel?: () => void;
}

function getInitialValues(participant?: Participant | null) {
  return {
    name: participant?.name ?? '',
    gender: participant?.gender ?? ('male' as const),
    note: participant?.note ?? '',
    origin: (participant?.origin ?? '') as ParticipantOriginValue,
    instagram: participant?.instagram ?? '',
  };
}

export default function PlayerForm({
  title,
  submitLabel,
  initialParticipant,
  submitDisabled = false,
  onSubmit,
  onCancel,
}: PlayerFormProps) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [note, setNote] = useState('');
  const [origin, setOrigin] = useState<ParticipantOriginValue>('');
  const [instagram, setInstagram] = useState('');

  useEffect(() => {
    const nextValues = getInitialValues(initialParticipant);
    setName(nextValues.name);
    setGender(nextValues.gender);
    setNote(nextValues.note);
    setOrigin(nextValues.origin);
    setInstagram(nextValues.instagram);
  }, [initialParticipant]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      return;
    }

    const participant: Participant = {
      id: initialParticipant?.id ?? uuidv4(),
      name: name.trim(),
      gender,
      note: note.trim(),
      origin: origin || undefined,
      instagram: instagram.trim() || undefined,
    };

    await onSubmit(participant);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4"
    >
      <h3 className="font-bold text-gray-800">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Full name"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
            value={gender}
            onChange={(event) => setGender(event.target.value as typeof gender)}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Skill Note</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. Beginner, Advanced..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Origin</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
            value={origin}
            onChange={(event) => setOrigin(event.target.value as ParticipantOriginValue)}
          >
            <option value="">- None -</option>
            <option value="reclub">Reclub</option>
            <option value="kuyy">Kuyy</option>
            <option value="ayo">Ayo</option>
            <option value="wa">WA</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
            value={instagram}
            onChange={(event) => setInstagram(event.target.value)}
            placeholder="@username (optional)"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitDisabled}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-60"
        >
          {submitDisabled ? 'Saving...' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}