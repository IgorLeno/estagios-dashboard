import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { NextResponse } from "next/server"
import { accessDecision, isAllowedGoogleProfile } from "@/lib/auth/access"

/**
 * Google login restricted to `ALLOWED_EMAIL`. Credentials come from the standard Auth.js
 * variables (`AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`). JWT sessions only:
 * there is no database.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    signIn({ account, profile }) {
      return account?.provider === "google" && isAllowedGoogleProfile(profile, process.env.ALLOWED_EMAIL)
    },
    // Runs in `proxy.ts` for every matched request.
    authorized({ request, auth }) {
      const decision = accessDecision({
        pathname: request.nextUrl.pathname,
        sessionEmail: auth?.user?.email,
        allowedEmail: process.env.ALLOWED_EMAIL,
      })
      if (decision === "unauthorized") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
      return decision === "allow"
    },
  },
})
