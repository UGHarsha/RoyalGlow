import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data?.user) {
      // Redirect to a client page that will save the profile
      // Pass user info as query params so the client component can call the backend
      const user = data.user
      const userId = user.id
      const email = user.email || ''
      // For Google OAuth, the name comes from user_metadata
      const name = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0]

      const redirectUrl = new URL(`${origin}/auth/sync`)
      redirectUrl.searchParams.set('userId', userId)
      redirectUrl.searchParams.set('email', email)
      redirectUrl.searchParams.set('name', name)
      redirectUrl.searchParams.set('next', next)
      return NextResponse.redirect(redirectUrl.toString())
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
