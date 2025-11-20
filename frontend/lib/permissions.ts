import type { Role, User } from "@/types/api";

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  user: User | null | undefined,
  resource: string,
  action: string,
): boolean {
  if (!user || !user.role) {
    return false;
  }

  const permissions = user.role.permissions;
  if (!permissions) {
    return false;
  }

  const resourcePermissions = permissions[resource];
  if (!resourcePermissions) {
    return false;
  }

  return (
    resourcePermissions.includes(action) || resourcePermissions.includes("*")
  );
}

/**
 * Check if a user has a specific role
 */
export function hasRole(
  user: User | null | undefined,
  roleName: string,
): boolean {
  if (!user || !user.role) {
    return false;
  }

  return user.role.name === roleName;
}

/**
 * Check if a user has at least a minimum role level
 */
export function hasMinLevel(
  user: User | null | undefined,
  minLevel: number,
): boolean {
  if (!user || !user.role) {
    return false;
  }

  return user.role.level >= minLevel;
}

/**
 * Check if a user is an admin
 */
export function isAdmin(user: User | null | undefined): boolean {
  return hasRole(user, "admin");
}

/**
 * Check if a user is a moderator or higher
 */
export function isModerator(user: User | null | undefined): boolean {
  return hasMinLevel(user, 50);
}

/**
 * Get all permissions for a user as a flat array
 */
export function getUserPermissions(user: User | null | undefined): string[] {
  if (!user || !user.role || !user.role.permissions) {
    return [];
  }

  const allPermissions: string[] = [];
  const permissions = user.role.permissions;

  for (const resource in permissions) {
    const actions = permissions[resource];
    for (const action of actions) {
      allPermissions.push(`${resource}:${action}`);
    }
  }

  return allPermissions;
}

/**
 * Permission constants for common permissions
 */
export const PERMISSIONS = {
  USERS: {
    READ: { resource: "users", action: "read" },
    CREATE: { resource: "users", action: "create" },
    UPDATE: { resource: "users", action: "update" },
    DELETE: { resource: "users", action: "delete" },
  },
  ROLES: {
    READ: { resource: "roles", action: "read" },
    CREATE: { resource: "roles", action: "create" },
    UPDATE: { resource: "roles", action: "update" },
    DELETE: { resource: "roles", action: "delete" },
  },
  ADMIN: {
    ACCESS: { resource: "admin", action: "access" },
  },
  PROFILE: {
    READ: { resource: "profile", action: "read" },
    UPDATE: { resource: "profile", action: "update" },
  },
  CONTENT: {
    READ: { resource: "content", action: "read" },
    CREATE: { resource: "content", action: "create" },
    UPDATE: { resource: "content", action: "update" },
    DELETE: { resource: "content", action: "delete" },
    MODERATE: { resource: "content", action: "moderate" },
  },
} as const;

/**
 * Role level constants
 */
export const ROLE_LEVELS = {
  USER: 10,
  MODERATOR: 50,
  ADMIN: 100,
} as const;
