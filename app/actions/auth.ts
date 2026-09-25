"use server"

import { signIn, signOut } from "@/auth"

export async function signInWithGoogle(formData: FormData) {
  const callbackUrl = formData.get("callbackUrl")
  // Auth.js' default redirect callback only follows same-origin targets.
  await signIn("google", { redirectTo: typeof callbackUrl === "string" && callbackUrl ? callbackUrl : "/" })
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" })
}
