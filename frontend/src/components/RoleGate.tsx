import React from 'react'
import { useAuth } from '../store/auth'
import { Role } from '../types'
import { hasRole } from '../lib/permissions'

interface RoleGateProps {
  /** Roles allowed to see the children. */
  allow: Role[]
  /** Optional fallback when not permitted (defaults to rendering nothing). */
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * Show/hide UI based on the current user's role.
 *
 * Example — only Admins see the delete button; Managers + Admins see Approvals:
 *
 *   <RoleGate allow={['admin']}>
 *     <button onClick={deleteEverything}>Delete</button>
 *   </RoleGate>
 *
 *   <RoleGate allow={['manager', 'admin']}>
 *     <NavLink to="/approvals">Pending approvals</NavLink>
 *   </RoleGate>
 *
 * NOTE: This is UX only. The server's require_role guards are the real
 * security boundary — never rely on hidden UI to protect an action.
 */
export const RoleGate: React.FC<RoleGateProps> = ({ allow, fallback = null, children }) => {
  const role = useAuth((s) => s.user?.role)
  return hasRole(role as Role | undefined, ...allow) ? <>{children}</> : <>{fallback}</>
}
