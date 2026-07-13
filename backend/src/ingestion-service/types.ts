// Raw shape returned by GET /get/games. Deliberately loose (index
// signature) because worldcup26.ir returns extra fields — notably
// home_scorers/away_scorers — that we must never read or store. Only the
// named fields below are ever touched by this service.
export interface RawMatch {
  id: string;
  home_team_name_en: string;
  away_team_name_en: string;
  home_score: string;
  away_score: string;
  finished: string; // "TRUE" | "FALSE" (string, not boolean)
  time_elapsed: string; // "notstarted" | "live" | "finished" | anything else
  group: string;
  type: string;
  local_date: string;
  stadium_id: string;
  [key: string]: unknown;
}

// Trimmed, published/cached shape. No scorer fields, ever.
export interface MatchEvent {
  match_id: string;
  home_team_name_en: string;
  away_team_name_en: string;
  home_score: string;
  away_score: string;
  finished: string;
  time_elapsed: string;
  group: string;
  type: string;
  local_date: string;
  stadium_id: string;
  last_updated: string; // ISO timestamp, set when we write/publish
}
