/**
 * Authentication Guard
 *
 * Provides token validation, expiration checking, and session management.
 * Prevents security vulnerabilities from cached authentication state.
 */

import { getAuthToken, removeAuthToken } from "./api";

/**
 * Simple JWT decoder (doesn't validate signature - that's done server-side)
 * Used only for reading expiration time
 */
interface JWTPayload {
  exp?: number;
  iat?: number;
  sub?: string;
  [key: string]: unknown;
}

function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded) as JWTPayload;
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
}

/**
 * Check if token is expired
 * Returns true if token is expired or invalid
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);

  // If we can't decode as JWT, it might be a different token format (e.g., opaque token)
  // In this case, we'll trust the backend to validate it and not expire it client-side
  if (!payload) {
    return false;
  }

  // If there's no expiration claim, assume it's valid (backend will validate)
  if (!payload.exp) {
    return false;
  }

  // JWT exp is in seconds, Date.now() is in milliseconds
  const currentTime = Math.floor(Date.now() / 1000);
  const expirationTime = payload.exp;

  // Add 60 second buffer - consider token expired 1 minute before actual expiration
  const isExpired = currentTime >= expirationTime - 60;

  return isExpired;
}

/**
 * Get time until token expires (in milliseconds)
 * Returns 0 if token is expired or invalid
 */
export function getTokenExpirationTime(token: string): number {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return 0;
  }

  const currentTime = Date.now();
  const expirationTime = payload.exp * 1000; // Convert to milliseconds
  const timeUntilExpiration = expirationTime - currentTime;

  return Math.max(0, timeUntilExpiration);
}

/**
 * Validate authentication token
 * Returns true if token exists and is not expired
 */
export function validateAuthToken(): boolean {
  const token = getAuthToken();

  if (!token) {
    return false;
  }

  if (isTokenExpired(token)) {
    // Token is expired, remove it
    removeAuthToken();
    return false;
  }

  return true;
}

/**
 * Get validated token or null
 * Returns token only if it exists and is not expired
 */
export function getValidatedToken(): string | null {
  const token = getAuthToken();

  if (!token) {
    return null;
  }

  if (isTokenExpired(token)) {
    removeAuthToken();
    return null;
  }

  return token;
}

/**
 * Check if user should be redirected to login
 * This is the main auth guard function
 */
export function requiresAuthentication(): boolean {
  return !validateAuthToken();
}

/**
 * Get token payload data
 */
export function getTokenPayload(): JWTPayload | null {
  const token = getAuthToken();
  if (!token) {
    return null;
  }

  return decodeJWT(token);
}
