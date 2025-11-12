# Components - CLAUDE.md

Context-specific guidance for the `/components` directory.

## Component Architecture

### Component Categories

**Feature Components** (top-level components/)
- `add-vaga-dialog.tsx` / `edit-vaga-dialog.tsx` - CRUD dialogs with form state, validation, and Supabase integration
- `vagas-table.tsx` - Main data table with filters, sorting, and row actions
- `resumo-page.tsx` - Reports and analytics with date range filtering
- `configuracoes-page.tsx` - Settings management
- `meta-card.tsx` - Daily goal display with inline editing
- `dashboard-header.tsx` - Navigation and date picker
- `markdown-upload.tsx` / `file-upload.tsx` - File upload components with drag-and-drop

**UI Primitives** (components/ui/)
- Radix UI-based components (button, dialog, input, select, table, etc.)
- Styled with Tailwind CSS
- Reusable across the application

## Key Patterns

### Client Component Default
All feature components use `"use client"` directive because they:
- Manage local state with `useState`
- Use effects with `useEffect`
- Handle user interactions and events
- Access Supabase client-side SDK

### Form Handling Pattern
```typescript
// Standard pattern used in dialogs
const [formData, setFormData] = useState({...})
const [loading, setLoading] = useState(false)

// Supabase interaction
const supabase = createClient() // client-side

// Submit handler
async function handleSubmit() {
  setLoading(true)
  try {
    const { error } = await supabase.from('table').insert(...)
    if (error) throw error
    toast.success("Success message")
    onSuccess() // Callback to parent
  } catch (error) {
    toast.error("Error message")
  } finally {
    setLoading(false)
  }
}
```

### Dialog Components Pattern
- Use Radix `Dialog` with controlled `open`/`onOpenChange` props
- Accept `onSuccess` callback to trigger parent data refresh
- Reset form state on dialog close
- Show loading states during async operations
- Use toast notifications (Sonner) for user feedback

### File Upload Pattern
Both upload components follow similar flow:
1. Drag-and-drop or file input triggers upload
2. Upload to Supabase Storage with progress tracking
3. Return public URL to parent component
4. For markdown files: fetch content and parse via `parseVagaFromMarkdown()`
5. Auto-fill form fields with parsed data

### Data Fetching Pattern
```typescript
// Load data on mount or when dependencies change
useEffect(() => {
  loadData()
}, [dependency])

async function loadData() {
  setLoading(true)
  try {
    const { data, error } = await supabase
      .from('table')
      .select('*')
      .eq('field', value)

    if (error) throw error
    setState(data)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    setLoading(false)
  }
}
```

## Component Integration

### TypeScript Types
Always import types from `@/lib/types.ts`:
```typescript
import type { VagaEstagio, MetaDiaria, Configuracao } from "@/lib/types"
```

### Utilities
- `@/lib/date-utils` - Date calculations (especially `getDataInscricao()`)
- `@/lib/markdown-parser` - Parse markdown analysis files
- `@/lib/utils` - General utilities (className merging with `cn()`)

### Supabase Client
```typescript
import { createClient } from "@/lib/supabase/client"
const supabase = createClient()
```

Never use server client in these components (they're all client-side).

## Styling Conventions

### Tailwind Patterns
- Use utility classes for spacing, colors, typography
- Responsive design with mobile-first approach (sm:, md:, lg: breakpoints)
- Use `cn()` utility to merge className conditionally:
  ```typescript
  import { cn } from "@/lib/utils"

  <div className={cn(
    "base-classes",
    condition && "conditional-classes"
  )} />
  ```

### Color Scheme
- Primary: Blue/violet tones (`bg-blue-500`, `text-violet-600`)
- Status badges: Custom colors per status (Pendente, Avançado, Melou, Contratado)
- Gradients: Used in MetaCard for visual progress feedback

## State Management

### Local State Only
- No global state management (Redux, Zustand, etc.)
- State lifted to parent when needed
- Callbacks (`onSuccess`, `onOpenChange`) for parent communication

### Supabase as Source of Truth
- Data fetched on mount and after mutations
- No optimistic updates - refetch after create/update/delete
- Parent components trigger child data refresh via callbacks

## Common Modifications

### Adding a New Dialog Component
1. Copy structure from `add-vaga-dialog.tsx`
2. Define props interface with `open`, `onOpenChange`, `onSuccess`
3. Set up form state with `useState`
4. Implement Supabase mutation in submit handler
5. Add toast notifications for success/error
6. Reset form on dialog close

### Adding a New Table Column
1. Update type in `@/lib/types.ts`
2. Add column definition to table component
3. Update Supabase select query to include new field
4. Add field to add/edit dialog forms

### Integrating File Upload
Use existing `FileUpload` or `MarkdownUpload` components:
```typescript
<MarkdownUpload
  onUploadComplete={(url, parsedData) => {
    setFormData(prev => ({
      ...prev,
      arquivo_analise_url: url,
      ...parsedData // Auto-fill from markdown
    }))
  }}
/>
```
