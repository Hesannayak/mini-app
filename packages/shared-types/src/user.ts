export type Language = 'hi' | 'ta' | 'te' | 'en';

export type PermissionLevel = 1 | 2 | 3 | 4;

export interface User {
  id: string;
  phone_hash: string;
  name?: string;
  language: Language;
  permission_level: PermissionLevel;
  mini_score: number;
  created_at: string;
  updated_at: string;
}

export interface UserContact {
  id: string;
  user_id: string;
  name: string;
  alias?: string; // "Maa", "Amma"
  upi_id_encrypted: string;
  is_trusted: boolean;
  created_at: string;
}
