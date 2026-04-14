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

type MatchRow = {
  id: string;
  event_id: string;
  round: number;
  team_a: string[];
  team_b: string[];
  score_a: number | null;
  score_b: number | null;
  status: 'pending' | 'ongoing' | 'completed';
  created_at: string;
};

type ParticipantRow = {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  note: string;
  origin: 'reclub' | 'kuyy' | 'ayo' | 'wa' | 'other' | null;
  instagram: string | null;
};

type EventParticipantRow = {
  event_id: string;
  participant_id: string;
  present: boolean;
};

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

function mapMatchRow(row: MatchRow): Match {
  return {
    id: row.id,
    eventId: row.event_id,
    round: row.round,
    teamA: row.team_a,
    teamB: row.team_b,
    scoreA: row.score_a,
    scoreB: row.score_b,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapMatchToRow(match: Match): MatchRow {
  return {
    id: match.id,
    event_id: match.eventId,
    round: match.round,
    team_a: match.teamA,
    team_b: match.teamB,
    score_a: match.scoreA,
    score_b: match.scoreB,
    status: match.status,
    created_at: match.createdAt,
  };
}

function mapParticipantRow(row: ParticipantRow): Participant {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    note: row.note,
    origin: row.origin ?? undefined,
    instagram: row.instagram ?? undefined,
  };
}

function mapParticipantToRow(participant: Participant): ParticipantRow {
  return {
    id: participant.id,
    name: participant.name,
    gender: participant.gender,
    note: participant.note,
    origin: participant.origin ?? null,
    instagram: participant.instagram ?? null,
  };
}

function mapEventParticipantRow(row: EventParticipantRow): EventParticipant {
  return {
    eventId: row.event_id,
    participantId: row.participant_id,
    present: row.present,
  };
}

function mapEventParticipantToRow(
  eventParticipant: EventParticipant
): EventParticipantRow {
  return {
    event_id: eventParticipant.eventId,
    participant_id: eventParticipant.participantId,
    present: eventParticipant.present,
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

export interface EventDependencySummary {
  participantCount: number;
  matchCount: number;
}

export async function getEventDependencySummary(
  eventId: string
): Promise<EventDependencySummary> {
  const supabase = getSupabaseClient();
  const [{ count: participantCount, error: participantError }, { count: matchCount, error: matchError }] =
    await Promise.all([
      supabase
        .from('event_participants')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId),
      supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId),
    ]);

  if (participantError) {
    throw new Error(`Failed to load event participant count: ${participantError.message}`);
  }

  if (matchError) {
    throw new Error(`Failed to load event match count: ${matchError.message}`);
  }

  return {
    participantCount: participantCount ?? 0,
    matchCount: matchCount ?? 0,
  };
}

export async function deleteEvent(id: string): Promise<void> {
  const dependencySummary = await getEventDependencySummary(id);

  if (dependencySummary.participantCount > 0 || dependencySummary.matchCount > 0) {
    throw new Error('Cannot delete event because it already has participants or matches.');
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from('events').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete event: ${error.message}`);
  }
}

// Participants
export async function getParticipants(): Promise<Participant[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('participants')
    .select('id, name, gender, note, origin, instagram')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to load participants: ${error.message}`);
  }

  return (data ?? []).map(mapParticipantRow);
}

export async function saveParticipant(p: Participant): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('participants').upsert(mapParticipantToRow(p));

  if (error) {
    throw new Error(`Failed to save participant: ${error.message}`);
  }
}

export async function deleteParticipant(id: string): Promise<void> {
  const matchCount = await getParticipantMatchCount(id);

  if (matchCount > 0) {
    throw new Error('Cannot delete player because they already have matches.');
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from('participants').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete participant: ${error.message}`);
  }
}

// EventParticipants
export async function getAllEventParticipants(): Promise<EventParticipant[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('event_participants')
    .select('event_id, participant_id, present');

  if (error) {
    throw new Error(`Failed to load event participants: ${error.message}`);
  }

  return (data ?? []).map(mapEventParticipantRow);
}

export async function getEventParticipants(
  eventId: string
): Promise<EventParticipant[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('event_participants')
    .select('event_id, participant_id, present')
    .eq('event_id', eventId);

  if (error) {
    throw new Error(`Failed to load event participants: ${error.message}`);
  }

  return (data ?? []).map(mapEventParticipantRow);
}

export async function saveEventParticipant(ep: EventParticipant): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('event_participants')
    .upsert(mapEventParticipantToRow(ep), { onConflict: 'event_id,participant_id' });

  if (error) {
    throw new Error(`Failed to save event participant: ${error.message}`);
  }
}

export async function updateEventParticipant(ep: EventParticipant): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('event_participants')
    .update({ present: ep.present })
    .eq('event_id', ep.eventId)
    .eq('participant_id', ep.participantId);

  if (error) {
    throw new Error(`Failed to update event participant: ${error.message}`);
  }
}

export async function removeEventParticipant(
  eventId: string,
  participantId: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('event_participants')
    .delete()
    .eq('event_id', eventId)
    .eq('participant_id', participantId);

  if (error) {
    throw new Error(`Failed to remove event participant: ${error.message}`);
  }
}

// Matches
export async function getAllMatches(): Promise<Match[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('matches')
    .select('id, event_id, round, team_a, team_b, score_a, score_b, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load matches: ${error.message}`);
  }

  return (data ?? []).map(mapMatchRow);
}

export async function getMatches(eventId: string): Promise<Match[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('matches')
    .select('id, event_id, round, team_a, team_b, score_a, score_b, status, created_at')
    .eq('event_id', eventId)
    .order('round', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load matches: ${error.message}`);
  }

  return (data ?? []).map(mapMatchRow);
}

export async function saveMatch(match: Match): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('matches').insert(mapMatchToRow(match));

  if (error) {
    throw new Error(`Failed to save match: ${error.message}`);
  }
}

export async function updateMatch(match: Match): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('matches')
    .update(mapMatchToRow(match))
    .eq('id', match.id);

  if (error) {
    throw new Error(`Failed to update match: ${error.message}`);
  }
}

export async function deleteMatch(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('matches').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete match: ${error.message}`);
  }
}

export async function getParticipantMatchCount(participantId: string): Promise<number> {
  const matches = await getAllMatches();

  return matches.filter(
    (match) => match.teamA.includes(participantId) || match.teamB.includes(participantId)
  ).length;
}
