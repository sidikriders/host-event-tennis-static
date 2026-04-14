'use client';

import { useState } from 'react';
import { Participant } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface ParticipantFormProps {
  onAdd: (participant: Participant) => void | Promise<void>;
}

export default function ParticipantForm({ onAdd }: ParticipantFormProps) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [note, setNote] = useState('');
  const [origin, setOrigin] = useState<'reclub' | 'kuyy' | 'ayo' | 'wa' | 'other' | ''>('');
  const [instagram, setInstagram] = useState('');
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const p: Participant = {
      id: uuidv4(),
      name: name.trim(),
      gender,
      note: note.trim(),
      origin: origin || undefined,
      instagram: instagram.trim() || undefined,
    };
    onAdd(p);
    setName('');
    setNote('');
    setOrigin('');
    setInstagram('');
    setGender('male');
    setOpen(false);
  };

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
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4"
    >
      <h3 className="font-bold text-gray-800">New Participant</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
            value={gender}
            onChange={(e) => setGender(e.target.value as typeof gender)}
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
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Beginner, Advanced..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Origin</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
            value={origin}
            onChange={(e) => setOrigin(e.target.value as typeof origin)}
          >
            <option value="">— None —</option>
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
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="@username (optional)"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
