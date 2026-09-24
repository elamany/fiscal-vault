export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    label: 'At least 8 characters',
    test: (pwd) => pwd.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'At least one uppercase letter',
    test: (pwd) => /[A-Z]/.test(pwd),
  },
  {
    id: 'lowercase',
    label: 'At least one lowercase letter',
    test: (pwd) => /[a-z]/.test(pwd),
  },
  {
    id: 'number',
    label: 'At least one number',
    test: (pwd) => /[0-9]/.test(pwd),
  },
];

/**
 * Returns true only if ALL password rules pass.
 * Used by both frontend (UX) and backend (security).
 */
export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

/**
 * Returns an object mapping rule IDs to their pass/fail status.
 * Used by the frontend to show visual feedback per rule.
 */
export function getPasswordRuleStatus(password: string): Record<string, boolean> {
  const status: Record<string, boolean> = {};
  PASSWORD_RULES.forEach((rule) => {
    status[rule.id] = rule.test(password);
  });
  return status;
}