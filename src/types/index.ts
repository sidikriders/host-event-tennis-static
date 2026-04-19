export type ClubRole = 'owner' | 'admin' | 'member';

export interface Club {
  id: string;
  name: string;
  tagName: string;
  description: string;
  createdById: string;
  createdAt: string;
}

export interface ClubMember {
  clubId: string;
  userId: string;
  role: ClubRole;
  createdAt: string;
  club: Club;
}

export interface Event {
  id: string;
  clubId: string;
  createdById: string;
  name: string;
  date: string;
  location: string;
  courts: string[];
  matchType: 'single' | 'double';
  createdAt: string;
}

export interface Participant {
  id: string;
  clubId: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  note: string;
  origin?: 'reclub' | 'kuyy' | 'ayo' | 'wa' | 'other';
  instagram?: string;
}

export interface EventParticipant {
  eventId: string;
  participantId: string;
  present: boolean;
}

export interface Match {
  id: string;
  clubId: string;
  eventId: string;
  round: number;
  court: string;
  teamA: string[];
  teamB: string[];
  scoreA: number | null;
  scoreB: number | null;
  status: 'pending' | 'ongoing' | 'completed';
  createdAt: string;
}

export interface PlayerStats {
  participantId: string;
  participant: Participant;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  gamesWon: number;
  gamesLost: number;
  points: number;
  rank: number;
}
