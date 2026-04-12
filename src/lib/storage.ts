import { Event, Participant, EventParticipant, Match } from '@/types';

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

// Events
export function getEvents(): Event[] {
  return load<Event>(KEYS.EVENTS).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getEvent(id: string): Event | undefined {
  return load<Event>(KEYS.EVENTS).find((e) => e.id === id);
}

export function saveEvent(event: Event): void {
  const events = load<Event>(KEYS.EVENTS);
  const idx = events.findIndex((e) => e.id === event.id);
  if (idx >= 0) events[idx] = event;
  else events.push(event);
  save(KEYS.EVENTS, events);
}

export function deleteEvent(id: string): void {
  save(KEYS.EVENTS, load<Event>(KEYS.EVENTS).filter((e) => e.id !== id));
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
    .sort((a, b) => a.round - b.round || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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
