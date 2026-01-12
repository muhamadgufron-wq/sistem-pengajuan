export interface EmployeeProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  nik?: string | null;
  division?: string | null;
  position?: string | null;
  phone_number?: string | null;
  address?: string | null;
  join_date?: string | null;
  employment_status?: 'Tetap' | 'Kontrak' | 'Probation' | null;
}
