import { betterAuth } from "better-auth";

// BetterAuth client configuration
export const authClient = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "",
  basePath: "/api/v1/auth",

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  // Email and password configuration
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
});

// Auth types for TypeScript
export type Session = typeof authClient.$Infer.Session;
export type User = typeof authClient.$Infer.Session.user;
