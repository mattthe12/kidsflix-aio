export function normalizeLoginIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

/** Existing parent passwords may be shorter than the sign-up minimum. */
export function loginFormValid(identifier: string, password: string): boolean {
  return Boolean(identifier.trim() && password);
}

export function signupPasswordError(password: string): string | null {
  if (password.length < 6) return 'Password must be at least 6 characters.';
  return null;
}

/** Administrator bootstrap passwords are temporary and must be replaced. */
export function adminPasswordError(password: string, confirmation: string): string | null {
  if (password.length < 8) return 'Use at least 8 characters for the new administrator password.';
  if (password !== confirmation) return 'The passwords do not match.';
  return null;
}
