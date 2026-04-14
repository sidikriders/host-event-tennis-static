'use client';

import { useState } from 'react';

import { Participant } from '@/types';
import PlayerForm from '@/components/PlayerForm';

interface ParticipantFormProps {
  onAdd: (participant: Participant) => void | Promise<void>;
}

export default function ParticipantForm({ onAdd }: ParticipantFormProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border-2 border-dashed border-green-400 rounded-xl p-4 text-green-600 hover:bg-green-50 transition-colors font-semibold"
      >
        + Add New Participant
      </button>
    );
  }

  return (
    <PlayerForm
      title="New Participant"
      submitLabel="Add"
      onSubmit={async (participant) => {
        await onAdd(participant);
        setOpen(false);
      }}
      onCancel={() => setOpen(false)}
    />
  );
}
