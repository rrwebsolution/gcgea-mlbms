import * as React from "react"
import type { Role, SystemUser } from "@/types"
import { computeEffectivePermissionEntries } from "@/utils/effective-permissions"

type EffectivePermissionInput = Pick<SystemUser, "roleId" | "additionalRoleIds" | "allowedPermissions" | "deniedPermissions">

/** Live, memoized effective-permission breakdown for a user (or a draft while editing). */
export function useEffectivePermissions(user: EffectivePermissionInput | undefined, roles: Role[]) {
  return React.useMemo(() => {
    if (!user) return { entries: [], effectiveCount: 0 }
    const entries = computeEffectivePermissionEntries(user, roles)
    return { entries, effectiveCount: entries.filter((e) => e.effective).length }
  }, [user, roles])
}
