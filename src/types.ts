export type UserRole = 'Student' | 'Admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  studentId?: string;
  title?: string;
  avatar?: string;
  password?: string;
}

export type ResourceCategory = 'Room' | 'Lab Gear' | 'Hardware';

export interface Resource {
  id: number;
  name: string;
  category: ResourceCategory;
  capacity?: number;
  specs: string;
  guidelines: string;
  imageUrl?: string;
  location?: string;
  requiresProof?: boolean;
}

export type BookingStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface Booking {
  id: number;
  resource_id: number;
  user_id: number;
  start_time: string; // ISO string e.g. "2026-10-18T10:00"
  end_time: string;   // ISO string e.g. "2026-10-18T12:00"
  purpose: string;
  status: BookingStatus;
  admin_notes?: string;
  created_at: string;
  proofFile?: string;     // URL or data URI
  proofFileName?: string; // Display filename e.g. "advisor_approval_capstone.pdf"
}

export type AuditAction = 'Created' | 'Approved' | 'Rejected' | 'Cancelled';

export interface AuditLog {
  id: number;
  booking_id: number;
  action: AuditAction;
  performed_by: string;
  timestamp: string;
  details?: string;
}
