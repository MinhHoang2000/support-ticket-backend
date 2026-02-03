/** Allowed role values for User.roles */
export const ROLES = ['user', 'admin', 'agent'] as const;

export type Role = (typeof ROLES)[number];

export function isValidRole(value: string): value is Role {
  return ROLES.includes(value as Role);
}

export function validateRoles(values: string[]): Role[] {
  const result: Role[] = [];
  for (const v of values) {
    if (isValidRole(v)) result.push(v);
  }
  return result;
}
