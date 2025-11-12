# App - CLAUDE.md

Context-specific guidance for the `/app` directory (Next.js App Router).

## Architecture Overview

This directory uses Next.js 16 App Router with file-based routing.

### Route Structure

```
app/
├── page.tsx                    # Main dashboard (/) - Client Component
├── layout.tsx                  # Root layout with metadata
├── vaga/
│   └── [id]/
│       └── page.tsx           # Individual vaga detail page
└── admin/
    ├── login/page.tsx         # Admin login - Server Component
    ├── sign-up/page.tsx       # Admin registration - Server Component
    └── dashboard/page.tsx     # Admin dashboard - Server Component
```

## Key Patterns

### Client vs Server Components

**Main Dashboard (`page.tsx`):**
- Client Component (`"use client"`)
- Manages state for vagas, meta, currentDate
- Uses Supabase client-side SDK
- Tab-based interface (Estágios, Resumo, Configurações)
- Real-time data loading with useEffect

**Admin Routes (`admin/**`):**
- Server Components (no "use client" directive)
- Use async/await for Supabase queries
- Auth checks with redirect
- Pass data as props to Client Components

### Authentication Pattern (Admin Routes)

```typescript
// Standard pattern in admin pages
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function ProtectedPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/admin/login")
  }

  // Fetch data server-side
  const { data: records } = await supabase.from('table').select('*')

  // Pass to Client Component
  return <ClientComponent user={data.user} records={records} />
}
```

### Data Flow Pattern

**Main Dashboard Flow:**
1. `page.tsx` (Client) - Manages state, loads data on mount/date change
2. Passes data + callbacks to child components
3. Child components trigger `onSuccess` callback after mutations
4. Parent refetches data via `loadData()`

**Admin Dashboard Flow:**
1. `admin/dashboard/page.tsx` (Server) - Fetches data, checks auth
2. Passes data to `<DashboardContent>` (Client Component)
3. Client component handles interactions, mutations
4. Uses router.refresh() or client-side refetch for updates

## Routing Conventions

### Dynamic Routes
`vaga/[id]/page.tsx` - Detail page for individual job application
- Access route param via `params.id`
- Fetch specific vaga data
- Display full details, files, history

### Route Groups
`admin/` - Grouped admin routes
- Shares authentication logic
- Can have shared layout (future enhancement)
- Isolated from main app routes

## Layout and Metadata

**Root Layout (`layout.tsx`):**
- Sets up HTML structure
- Includes global metadata (title, description)
- Loads fonts (Inter, Geist)
- Injects Vercel Analytics
- Wraps with Toaster for toast notifications

**Metadata Pattern:**
```typescript
export const metadata: Metadata = {
  title: "Dashboard Title",
  description: "Dashboard description",
}
```

## State Management Strategy

### No Global State
- Each route manages its own state
- Shared data fetched per-route (no caching across routes)
- Supabase is the single source of truth

### State Lifting
- Parent route component holds state
- Children receive state + callbacks via props
- Mutations trigger parent data refresh

### URL State
- Date selection could use URL params (future enhancement)
- Filters could be persisted in URL (future enhancement)
- Currently: all state is local component state

## Adding New Routes

### Public Route (Main App)
1. Create `app/new-route/page.tsx`
2. Decide: Client or Server Component?
   - Need state/interactivity → Client Component
   - Just rendering data → Server Component
3. Import types from `@/lib/types`
4. Use appropriate Supabase client

Example Client Component:
```typescript
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export default function NewPage() {
  const [data, setData] = useState([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('table').select('*')
      setData(data || [])
    }
    load()
  }, [])

  return <div>{/* content */}</div>
}
```

### Protected Route (Admin)
1. Create under `app/admin/`
2. Use Server Component pattern
3. Add auth check with redirect
4. Fetch data server-side
5. Pass to Client Component if interactivity needed

## Common Modifications

### Changing Main Dashboard Layout
Edit `app/page.tsx`:
- Tab structure in `<Tabs>` component
- Each tab has corresponding page component
- Add new tab: Import component, add `<TabsTrigger>` + `<TabsContent>`

### Adding Auth to Main Dashboard
Currently public. To add auth:
1. Convert `page.tsx` to Server Component
2. Add auth check (like admin routes)
3. Extract interactive UI to separate Client Component
4. Or use middleware for route protection

### Adding API Routes
Create `app/api/route-name/route.ts`:
```typescript
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data } = await supabase.from('table').select('*')
  return NextResponse.json(data)
}
```

## Testing Server Components

See main CLAUDE.md Testing section:
- Vitest has limitations with async Server Components
- Prefer E2E tests for Server Components
- Or extract logic to testable utilities in `/lib`
- Test Client Components with Vitest + Testing Library
