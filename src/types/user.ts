import type { PermissionCode, RoleName } from "./permission"

export type UserStatus = "Active" | "Inactive" | "Disabled"

export interface AuthUser {
  id: string
  fullName: string
  username: string
  email: string
  roleId: string
  roleName: RoleName | string
  roleIds: string[]
  permissions: PermissionCode[]
  avatarUrl?: string
  status: UserStatus
  lastLoginAt?: string
}

export interface SystemUser {
  id: string
  fullName: string
  username: string
  email: string
  contactNumber?: string
  /** Primary role id — determines the user's default badge/role label. */
  roleId: string
  roleName: RoleName | string
  /** Additional role ids stacked on top of the primary role. */
  additionalRoleIds: string[]
  /** @deprecated kept for backward compatibility with older mock records; prefer `allowedPermissions`. */
  additionalPermissions: PermissionCode[]
  allowedPermissions: PermissionCode[]
  deniedPermissions: PermissionCode[]
  requirePasswordChange: boolean
  remarks?: string
  status: UserStatus
  lastLoginAt?: string
  createdAt: string
  avatarUrl?: string
}

export interface LoginHistoryEntry {
  id: string
  userId: string
  loginAt: string
  ipAddress: string
  device: string
  status: "Success" | "Failed"
}

export interface LoginCredentials {
  usernameOrEmail: string
  password: string
  rememberMe: boolean
}
