import { Role } from '../types'

// Higher rank = more privilege. Admin inherits manager + user capabilities.
export const ROLE_RANK: Record<Role, number> = { user: 1, manager: 2, admin: 3 }

/** True if the role is one of the allowed roles. */
export function hasRole(role: Role | undefined, ...allowed: Role[]): boolean {
  return !!role && allowed.includes(role)
}

/** True if the role meets or exceeds a minimum rank (hierarchical check). */
export function atLeast(role: Role | undefined, min: Role): boolean {
  return !!role && ROLE_RANK[role] >= ROLE_RANK[min]
}

/**
 * Capability map — what each role may do. These mirror the SERVER-SIDE guards;
 * the frontend uses them only to show/hide UI. Real enforcement is the API's
 * require_role dependency — a hidden button is not a security control.
 */
export const can = {
  useAppFeatures: (r?: Role) => hasRole(r, 'user', 'manager', 'admin'),
  approveRegistrations: (r?: Role) => hasRole(r, 'manager', 'admin'),
  manageUsers: (r?: Role) => hasRole(r, 'admin'),
  deleteAnyData: (r?: Role) => hasRole(r, 'admin'),
  modifySettings: (r?: Role) => hasRole(r, 'admin'),
}
