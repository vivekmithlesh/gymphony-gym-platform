import { supabase } from '@/supabase'

/**
 * Verifies that the Supabase client can reach the backend.
 *
 * It performs a lightweight `getSession` call — no real credentials are
 * required and no data is read, so it is safe to run in any environment.
 *
 * @returns A promise that resolves to an object describing the outcome:
 *   - `ok: true`  — the client reached Supabase successfully.
 *   - `ok: false` — the call failed; `error` contains the reason.
 */
export async function testSupabaseConnection(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    const { error } = await supabase.auth.getSession()
    if (error) {
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
