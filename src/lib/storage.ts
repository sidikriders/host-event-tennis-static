import { Event, Participant, EventParticipant, Match } from '@/types';
import { getSupabaseClient } from '@/lib/supabase';

type EventRow = {
  id: string;
  name: string;
  date: string;
  location: string;
  match_type: 'single' | 'double';
  created_at: string;
};

const KEYS = {
  EVENTS: 'tennis_events',
  PARTICIPANTS: 'tennis_participants',
  EVENT_PARTICIPANTS: 'tennis_event_participants',
  MATCHES: 'tennis_matches',
};

function load<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(key) || '[]') as T[];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

function mapEventRow(row: EventRow): Event {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    location: row.location,
    matchType: row.match_type,
    createdAt: row.created_at,
  };
}

function mapEventToRow(event: Event): EventRow {
  return {
    id: event.id,
    name: event.name,
    date: event.date,
    location: event.location,
    match_type: event.matchType,
    created_at: event.createdAt,
  };
}

// Events
export async function getEvents(): Promise<Event[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('events')
    .select('id, name, date, location, match_type, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load events: ${error.message}`);
  }

  return (data ?? []).map(mapEventRow);
}

export async function getEvent(id: string): Promise<Event | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('events')
    .select('id, name, date, location, match_type, created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load event: ${error.message}`);
  }

  return data ? mapEventRow(data) : null;
}

export async function saveEvent(event: Event): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('events').upsert(mapEventToRow(event));

  if (error) {
    throw new Error(`Failed to save event: ${error.message}`);
  }
}

export async function deleteEvent(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('events').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete event: ${error.message}`);
  }

  // cascade delete
  save(
    KEYS.EVENT_PARTICIPANTS,
    load<EventParticipant>(KEYS.EVENT_PARTICIPANTS).filter((ep) => ep.eventId !== id)
  );
  save(
    KEYS.MATCHES,
    load<Match>(KEYS.MATCHES).filter((m) => m.eventId !== id)
  );
}

// Participants
export function getParticipants(): Participant[] {
  return load<Participant>(KEYS.PARTICIPANTS);
}

export function saveParticipant(p: Participant): void {
  const list = load<Participant>(KEYS.PARTICIPANTS);
  const idx = list.findIndex((x) => x.id === p.id);
  if (idx >= 0) list[idx] = p;
  else list.push(p);
  save(KEYS.PARTICIPANTS, list);
}

// EventParticipants
export function getEventParticipants(eventId: string): EventParticipant[] {
  return load<EventParticipant>(KEYS.EVENT_PARTICIPANTS).filter(
    (ep) => ep.eventId === eventId
  );
}

export function saveEventParticipant(ep: EventParticipant): void {
  const list = load<EventParticipant>(KEYS.EVENT_PARTICIPANTS);
  const exists = list.find(
    (x) => x.eventId === ep.eventId && x.participantId === ep.participantId
  );
  if (!exists) {
    list.push(ep);
    save(KEYS.EVENT_PARTICIPANTS, list);
  }
}

export function updateEventParticipant(ep: EventParticipant): void {
  const list = load<EventParticipant>(KEYS.EVENT_PARTICIPANTS);
  const idx = list.findIndex(
    (x) => x.eventId === ep.eventId && x.participantId === ep.participantId
  );
  if (idx >= 0) {
    list[idx] = ep;
    save(KEYS.EVENT_PARTICIPANTS, list);
  }
}

export function removeEventParticipant(eventId: string, participantId: string): void {
  save(
    KEYS.EVENT_PARTICIPANTS,
    load<EventParticipant>(KEYS.EVENT_PARTICIPANTS).filter(
      (ep) => !(ep.eventId === eventId && ep.participantId === participantId)
    )
  );
}

// Matches
export function getMatches(eventId: string): Match[] {
  return load<Match>(KEYS.MATCHES)
    .filter((m) => m.eventId === eventId)
    .sort(
      (a, b) =>
        a.round - b.round ||
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
}

export function saveMatch(match: Match): void {
  const list = load<Match>(KEYS.MATCHES);
  list.push(match);
  save(KEYS.MATCHES, list);
}

export function updateMatch(match: Match): void {
  const list = load<Match>(KEYS.MATCHES);
  const idx = list.findIndex((m) => m.id === match.id);
  if (idx >= 0) {
    list[idx] = match;
    save(KEYS.MATCHES, list);
  }
}

export function deleteMatch(id: string): void {
  save(KEYS.MATCHES, load<Match>(KEYS.MATCHES).filter((m) => m.id !== id));
}
