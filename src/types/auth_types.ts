export type UserRole = 'CUSTOMER' | 'BUSINESS_OWNER' | 'ADMIN';
export type SignupRole = 'CUSTOMER' | 'BUSINESS_OWNER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId?: string;
  isEmailVerified: boolean;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  signup: (
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string, 
    role: SignupRole,
    tenantName?: string,
    tenantSlug?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: string | null;
  isEmailVerified: boolean;
}

export interface ProfileData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isEmailVerified: boolean;
  createdAt: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  currentPassword?: string;
  newPassword?: string;
}