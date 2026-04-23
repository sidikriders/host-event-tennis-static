import { Club, Event, EventMatchRule, EventParticipant, Match, Participant } from '@/types';
import { getSupabaseClient } from '@/lib/supabase';

type ClubRow = {
  id: string;
  name: string;
  tag_name: string;
  description: string | null;
  created_by_id: string;
  created_at: string;
};

type EventRow = {
  id: string;
  club_id: string;
  created_by_id: string;
  name: string;
  date: string;
  location: string;
  courts: string[] | null;
  match_type: 'single' | 'double';
  created_at: string;
};

type MatchRow = {
  id: string;
  club_id: string;
  event_id: string;
  round: number;
  court: string | null;
  team_a: string[];
  team_b: string[];
  score_a: number | null;
  score_b: number | null;
  status: 'pending' | 'ongoing' | 'completed';
  created_at: string;
};

type ParticipantRow = {
  id: string;
  club_id: string;
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

type EventMatchRuleRow = {
  id: string;
  club_id: string;
  event_id: string;
  rule_type: EventMatchRule['ruleType'];
  participant_1_id: string;
  participant_2_id: string;
  created_by_id: string;
  created_at: string;
};

function normalizeCourts(courts: string[] | null | undefined): string[] {
  const nextCourts = (courts ?? []).map((court) => court.trim()).filter(Boolean);
  return nextCourts.length > 0 ? nextCourts : ['Court 1'];
}

function normalizeCourt(court: string | null | undefined): string {
  const nextCourt = court?.trim();
  return nextCourt ? nextCourt : 'Court 1';
}

function mapClubRow(row: ClubRow): Club {
  return {
    id: row.id,
    name: row.name,
    tagName: row.tag_name,
    description: row.description ?? '',
    createdById: row.created_by_id,
    createdAt: row.created_at,
  };
}

function mapEventRow(row: EventRow): Event {
  return {
    id: row.id,
    clubId: row.club_id,
    createdById: row.created_by_id,
    name: row.name,
    date: row.date,
    location: row.location,
    courts: normalizeCourts(row.courts),
    matchType: row.match_type,
    createdAt: row.created_at,
  };
}

function mapEventToRow(event: Event): EventRow {
  return {
    id: event.id,
    club_id: event.clubId,
    created_by_id: event.createdById,
    name: event.name,
    date: event.date,
    location: event.location,
    courts: normalizeCourts(event.courts),
    match_type: event.matchType,
    created_at: event.createdAt,
  };
}

function mapMatchRow(row: MatchRow): Match {
  return {
    id: row.id,
    clubId: row.club_id,
    eventId: row.event_id,
    round: row.round,
    court: normalizeCourt(row.court),
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
    club_id: match.clubId,
    event_id: match.eventId,
    round: match.round,
    court: normalizeCourt(match.court),
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
    clubId: row.club_id,
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
    club_id: participant.clubId,
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

function mapEventParticipantToRow(eventParticipant: EventParticipant): EventParticipantRow {
  return {
    event_id: eventParticipant.eventId,
    participant_id: eventParticipant.participantId,
    present: eventParticipant.present,
  };
}

function normalizeRuleParticipantIds(participant1Id: string, participant2Id: string) {
  return participant1Id < participant2Id
    ? { participant1Id, participant2Id }
    : { participant1Id: participant2Id, participant2Id: participant1Id };
}

function mapEventMatchRuleRow(row: EventMatchRuleRow): EventMatchRule {
  return {
    id: row.id,
    clubId: row.club_id,
    eventId: row.event_id,
    ruleType: row.rule_type,
    participant1Id: row.participant_1_id,
    participant2Id: row.participant_2_id,
    createdById: row.created_by_id,
    createdAt: row.created_at,
  };
}

function mapEventMatchRuleToRow(rule: EventMatchRule): EventMatchRuleRow {
  const normalizedPair = normalizeRuleParticipantIds(rule.participant1Id, rule.participant2Id);

  return {
    id: rule.id,
    club_id: rule.clubId,
    event_id: rule.eventId,
    rule_type: rule.ruleType,
    participant_1_id: normalizedPair.participant1Id,
    participant_2_id: normalizedPair.participant2Id,
    created_by_id: rule.createdById,
    created_at: rule.createdAt,
  };
}

export async function createClub(club: Club, ownerUserId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error: clubError } = await supabase.from('clubs').insert({
    id: club.id,
    name: club.name,
    tag_name: club.tagName,
    description: club.description,
    created_by_id: club.createdById,
    created_at: club.createdAt,
  });

  if (clubError) {
    throw new Error(`Failed to create club: ${clubError.message}`);
  }

  const { error: memberError } = await supabase.from('club_members').insert({
    club_id: club.id,
    user_id: ownerUserId,
    role: 'owner',
  });

  if (memberError) {
    throw new Error(`Failed to create club owner membership: ${memberError.message}`);
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ current_club_id: club.id, updated_at: new Date().toISOString() })
    .eq('id', ownerUserId);

  if (profileError) {
    throw new Error(`Failed to set active club: ${profileError.message}`);
  }
}

export async function getClub(clubId: string): Promise<Club | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('clubs')
    .select('id, name, tag_name, description, created_by_id, created_at')
    .eq('id', clubId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load club: ${error.message}`);
  }

  return data ? mapClubRow(data as ClubRow) : null;
}

export async function getEvents(clubId: string): Promise<Event[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('events')
    .select('id, club_id, created_by_id, name, date, location, courts, match_type, created_at')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load events: ${error.message}`);
  }

  return ((data ?? []) as EventRow[]).map(mapEventRow);
}

export async function getEvent(id: string): Promise<Event | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('events')
    .select('id, club_id, created_by_id, name, date, location, courts, match_type, created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load event: ${error.message}`);
  }

  return data ? mapEventRow(data as EventRow) : null;
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

export async function getEventDependencySummary(eventId: string): Promise<EventDependencySummary> {
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

export async function getParticipants(clubId: string): Promise<Participant[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('participants')
    .select('id, club_id, name, gender, note, origin, instagram')
    .eq('club_id', clubId)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to load participants: ${error.message}`);
  }

  return ((data ?? []) as ParticipantRow[]).map(mapParticipantRow);
}

export async function getParticipantsByIds(participantIds: string[]): Promise<Participant[]> {
  if (participantIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('participants')
    .select('id, club_id, name, gender, note, origin, instagram')
    .in('id', participantIds)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to load participants: ${error.message}`);
  }

  return ((data ?? []) as ParticipantRow[]).map(mapParticipantRow);
}

export async function saveParticipant(participant: Participant): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('participants').upsert(mapParticipantToRow(participant));

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

export async function getAllEventParticipants(clubId: string): Promise<EventParticipant[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('event_participants')
    .select('event_id, participant_id, present, events!inner(club_id)')
    .eq('events.club_id', clubId);

  if (error) {
    throw new Error(`Failed to load event participants: ${error.message}`);
  }

  return ((data ?? []) as EventParticipantRow[]).map(mapEventParticipantRow);
}

export async function getEventParticipants(eventId: string): Promise<EventParticipant[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('event_participants')
    .select('event_id, participant_id, present')
    .eq('event_id', eventId);

  if (error) {
    throw new Error(`Failed to load event participants: ${error.message}`);
  }

  return ((data ?? []) as EventParticipantRow[]).map(mapEventParticipantRow);
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

export async function removeEventParticipant(eventId: string, participantId: string): Promise<void> {
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

export async function getEventMatchRules(eventId: string): Promise<EventMatchRule[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('event_match_rules')
    .select('id, club_id, event_id, rule_type, participant_1_id, participant_2_id, created_by_id, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load match rules: ${error.message}`);
  }

  return ((data ?? []) as EventMatchRuleRow[]).map(mapEventMatchRuleRow);
}

export async function saveEventMatchRule(rule: EventMatchRule): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('event_match_rules')
    .upsert(mapEventMatchRuleToRow(rule), { onConflict: 'event_id,rule_type,participant_1_id,participant_2_id' });

  if (error) {
    throw new Error(`Failed to save match rule: ${error.message}`);
  }
}

export async function deleteEventMatchRule(ruleId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('event_match_rules').delete().eq('id', ruleId);

  if (error) {
    throw new Error(`Failed to delete match rule: ${error.message}`);
  }
}

export async function getAllMatches(clubId: string): Promise<Match[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('matches')
    .select('id, club_id, event_id, round, court, team_a, team_b, score_a, score_b, status, created_at')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load matches: ${error.message}`);
  }

  return ((data ?? []) as MatchRow[]).map(mapMatchRow);
}

export async function getMatches(eventId: string): Promise<Match[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('matches')
    .select('id, club_id, event_id, round, court, team_a, team_b, score_a, score_b, status, created_at')
    .eq('event_id', eventId)
    .order('round', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load matches: ${error.message}`);
  }

  return ((data ?? []) as MatchRow[]).map(mapMatchRow);
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
  const supabase = getSupabaseClient();
  const { count, error } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .or(`team_a.cs.{${participantId}},team_b.cs.{${participantId}}`);

  if (error) {
    throw new Error(`Failed to load player match count: ${error.message}`);
  }

  return count ?? 0;
}
