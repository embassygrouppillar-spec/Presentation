import { createClient } from '@supabase/supabase-js'

// Browser client (anon key — respects RLS, safe for client-side)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Server/admin client (service role — bypasses RLS, API routes only)
// Lazy-initialized to avoid errors on the client where the key isn't available
let _supabaseAdmin: ReturnType<typeof createClient> | null = null

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    if (!_supabaseAdmin) {
      _supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
    }
    return (_supabaseAdmin as any)[prop]
  },
})
