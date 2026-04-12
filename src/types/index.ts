export interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  matchType: 'single' | 'double';
  createdAt: string;
}

export interface Participant {
  id: string;
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
  eventId: string;
  round: number;
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
