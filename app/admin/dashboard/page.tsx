import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardContent } from "@/components/dashboard-content"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/admin/login")
  }

  // Fetch all inscricoes
  const { data: inscricoes, error: fetchError } = await supabase
    .from("inscricoes")
    .select("*")
    .order("created_at", { ascending: false })

  if (fetchError) {
    console.error("[v0] Error fetching inscricoes:", fetchError)
  }

  return <DashboardContent user={data.user} inscricoes={inscricoes || []} />
}
