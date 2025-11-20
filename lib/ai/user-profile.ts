// lib/ai/user-profile.ts
/**
 * User profile for personalized job analysis
 * This is a static configuration - future enhancement will move to database
 */
export interface UserProfile {
  skills: string[]
  experience: string[]
  education: string
  goals: string
}

/**
 * Static user profile for analysis personalization
 * TODO: Move to database in Phase 2
 */
export const USER_PROFILE: UserProfile = {
  skills: [
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "PostgreSQL",
    "Git",
    "Problem solving",
    "Team collaboration",
  ],
  experience: [
    "Desenvolvedor Full-Stack em projeto pessoal (estagios-dashboard)",
    "Experiência com Supabase e autenticação",
    "Implementação de features com IA (Gemini API)",
  ],
  education: "Cursando Engenharia de Software / Ciência da Computação",
  goals: "Conseguir estágio em tech para ganhar experiência prática em desenvolvimento de software",
}
