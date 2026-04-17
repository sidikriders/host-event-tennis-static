'use client';

import { useState } from 'react';

type MatchType = 'single' | 'double';

interface EventFormProps {
  initialValues: {
    name: string;
    date: string;
    location: string;
    courts: string[];
    matchType: MatchType;
  };
  submitLabel: string;
  submittingLabel: string;
  error: string | null;
  submitting: boolean;
  onSubmit: (values: {
    name: string;
    date: string;
    location: string;
    courts: string[];
    matchType: MatchType;
  }) => Promise<void>;
}

export default function EventForm({
  initialValues,
  submitLabel,
  submittingLabel,
  error,
  submitting,
  onSubmit,
}: EventFormProps) {
  const [name, setName] = useState(initialValues.name);
  const [date, setDate] = useState(initialValues.date);
  const [location, setLocation] = useState(initialValues.location);
  const [courts, setCourts] = useState(
    initialValues.courts.length > 0 ? initialValues.courts : ['Court 1']
  );
  const [matchType, setMatchType] = useState<MatchType>(initialValues.matchType);

  const updateCourt = (index: number, value: string) => {
    setCourts((currentCourts) => currentCourts.map((court, courtIndex) => {
      if (courtIndex !== index) {
        return court;
      }

      return value;
    }));
  };

  const addCourt = () => {
    setCourts((currentCourts) => [...currentCourts, `Court ${currentCourts.length + 1}`]);
  };

  const removeCourt = (index: number) => {
    setCourts((currentCourts) => {
      const nextCourts = currentCourts.filter((_, courtIndex) => courtIndex !== index);
      return nextCourts.length > 0 ? nextCourts : ['Court 1'];
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !date || !location.trim()) {
      return;
    }

    const normalizedCourts = courts.map((court) => court.trim()).filter(Boolean);
    if (normalizedCourts.length === 0) {
      return;
    }

    await onSubmit({
      name: name.trim(),
      date,
      location: location.trim(),
      courts: normalizedCourts,
      matchType,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 space-y-5 mt-2">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Event Name *
        </label>
        <input
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Sunday Americano"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Date *</label>
        <input
          type="date"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Location *</label>
        <input
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="e.g. Court 1, City Club"
          required
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="block text-sm font-semibold text-gray-700">Courts *</label>
          <button
            type="button"
            onClick={addCourt}
            className="text-sm font-semibold text-green-700 transition-colors hover:text-green-900"
          >
            + Add Court
          </button>
        </div>
        <div className="space-y-3">
          {courts.map((court, index) => (
            <div key={`${index}-${court}`} className="flex items-center gap-3">
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
                value={court}
                onChange={(event) => updateCourt(index, event.target.value)}
                placeholder={`Court ${index + 1}`}
                required
              />
              <button
                type="button"
                onClick={() => removeCourt(index)}
                disabled={courts.length === 1}
                className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Matches can be assigned to any of these court names.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Match Type *</label>
        <div className="grid grid-cols-2 gap-3">
          {(['single', 'double'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setMatchType(type)}
              className={`py-3 rounded-xl border-2 font-semibold transition-all ${
                matchType === type
                  ? 'border-green-500 bg-green-50 text-green-800'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {type === 'single' ? '👤 Singles (1v1)' : '👥 Doubles (2v2)'}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-base hover:bg-green-700 transition-colors disabled:opacity-60"
      >
        {submitting ? submittingLabel : submitLabel}
      </button>
    </form>
  );
}