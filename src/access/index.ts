// Tipos base
export type { Context, Guard, OrgRole, Sysadmin, WithUser } from './types'

// Guards (type predicates) y access functions de ownership
export { getOrgId, hasOrgRole, isAnyone, isAuthenticated, isOrgOwner, isSysadmin } from './guards'

// Combinators
export { and, not, or } from './combinators'

// DSL — construcción de Access functions
export { allow, allowIf, anyone } from './dsl'

// FieldAccess factory y aliases
export {
  fieldAccessFor,
  orgAdminFieldAccess,
  orgOwnerFieldAccess,
  selfOrSysadminFieldAccess,
  sysadminFieldAccess,
} from './fieldAccess'
