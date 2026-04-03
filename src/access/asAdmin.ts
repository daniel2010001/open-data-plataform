import type { Access } from 'payload'

import { or } from './or'
import { sysadmin } from './sysadmin'

/**
 * Wraps an Access function with a sysadmin bypass.
 *
 * Sysadmins always get full access (true). If the user is not a sysadmin,
 * the wrapped function is evaluated normally.
 *
 * This is the single place where the sysadmin cross-cutting concern lives.
 * Access functions passed here should be pure — no sysadmin check inside.
 *
 * @example
 * update: asAdmin(self)
 * update: asAdmin(orgRole(['owner', 'admin']))
 * read:   or(asAdmin(orgRole(['owner', 'admin'])), () => ({ status: { equals: 'published' } }))
 */
export const asAdmin = (fn: Access): Access => or(sysadmin, fn)
