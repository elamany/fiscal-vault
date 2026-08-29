export type UserRole = 'CUSTOMER' | 'BUSINESS_OWNER' | 'ADMIN';
export type SignupRole = 'CUSTOMER' | 'BUSINESS_OWNER';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  tenantId?: string;
  isEmailVerified: boolean;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, role: SignupRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  isEmailVerified: boolean;
}