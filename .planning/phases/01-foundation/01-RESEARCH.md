# Phase 1: Foundation - Research

**Researched:** 2026-02-04
**Domain:** Authentication, Role-Based Access Control, Database Schema (Supabase + Next.js 15)
**Confidence:** HIGH

## Summary

Phase 1 establishes the authentication system, database schema, and role-based access control for the MPM Employee Discount Platform. The stack is locked: Next.js 15, React 19, TypeScript, Tailwind CSS, and Supabase (PostgreSQL, Auth, RLS).

The standard approach uses `@supabase/ssr` for cookie-based server-side auth in Next.js App Router, a `profiles` table with a `role` column linked to `auth.users` via trigger, Supabase's Custom Access Token Hook to embed the role in JWTs, and RLS policies that read `auth.jwt() ->> 'user_role'` for row-level enforcement. Admin user creation uses `supabase.auth.admin.createUser()` via a Next.js Server Action that calls a service-role Supabase client server-side.

**Primary recommendation:** Use the official Supabase SSR pattern (browser client + server client + middleware for token refresh) with a `profiles` table for roles, a Custom Access Token Hook for JWT claims, and Next.js route groups `(auth)` / `(dashboard)` / `(admin)` for layout separation. All auth checks use `supabase.auth.getUser()` on the server -- never `getSession()`.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 15.5.x (latest 15.x patch) | Framework | Project decision; use latest 15.x security patch |
| `react` / `react-dom` | 19.x | UI library | Paired with Next.js 15 |
| `@supabase/supabase-js` | 2.90.x | Supabase client | Official client; requires Node 20+ |
| `@supabase/ssr` | 0.8.x | SSR cookie auth | Replaces deprecated `@supabase/auth-helpers-*`; cookie-based session |
| `typescript` | 5.x | Type safety | Project decision |
| `tailwindcss` | 4.x | Styling | Project decision |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `jwt-decode` | 4.x | Decode JWT client-side | Reading `user_role` claim from access token on client |
| `zod` | 3.x | Input validation | Validating Server Action inputs (login form, create user form) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@supabase/ssr` | `@supabase/auth-helpers-nextjs` | Auth helpers are deprecated; ssr is the replacement |
| Profiles table for roles | `user_metadata` for roles | Metadata is editable by users; profiles table is secure and queryable |
| Custom Access Token Hook | Querying profiles table on every request | Hook embeds role in JWT; avoids extra DB query per request |
| Next.js Server Actions for admin ops | Supabase Edge Functions | Server Actions are simpler for mutations from within Next.js UI |

**Installation:**
```bash
npm install next@15 react@19 react-dom@19 @supabase/supabase-js @supabase/ssr jwt-decode zod
npm install -D typescript @types/react @types/node tailwindcss
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (auth)/                    # Public auth pages (no auth required)
│   │   ├── login/page.tsx
│   │   ├── reset-password/page.tsx
│   │   ├── update-password/page.tsx
│   │   └── layout.tsx             # Minimal layout, no nav
│   ├── (dashboard)/               # Employee routes (auth required, any role)
│   │   ├── layout.tsx             # Auth-guarded layout with nav
│   │   └── page.tsx               # Employee home/dashboard
│   ├── (admin)/                   # Admin-only routes
│   │   ├── layout.tsx             # Admin-guarded layout (checks role=admin)
│   │   ├── employees/
│   │   │   └── page.tsx           # Employee management (AUTH-04)
│   │   └── page.tsx               # Admin dashboard
│   ├── auth/
│   │   ├── callback/route.ts      # Auth code exchange (PKCE callback)
│   │   └── confirm/route.ts       # Email confirmation handler
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Redirect to login or dashboard
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser client (createBrowserClient)
│   │   ├── server.ts              # Server client (createServerClient + cookies)
│   │   ├── middleware.ts           # updateSession() function
│   │   └── admin.ts               # Service-role client (server-only, for admin ops)
│   └── types/
│       └── database.ts            # Generated Supabase types
├── actions/
│   ├── auth.ts                    # Login, logout, reset password Server Actions
│   └── admin.ts                   # Create employee Server Action
├── components/
│   ├── auth/
│   │   ├── login-form.tsx
│   │   ├── reset-password-form.tsx
│   │   └── update-password-form.tsx
│   └── ui/                        # Shared UI components
└── middleware.ts                   # Root Next.js middleware (calls updateSession)
```

### Pattern 1: Supabase SSR Client Setup

**What:** Three Supabase client utilities -- browser, server, and admin (service-role).
**When to use:** Every page, action, and API route that touches Supabase.

**Browser Client (`lib/supabase/client.ts`):**
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Server Client (`lib/supabase/server.ts`):**
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from Server Component -- middleware handles it
          }
        },
      },
    }
  )
}
```

**Admin Client (`lib/supabase/admin.ts`):**
```typescript
import { createClient } from '@supabase/supabase-js'

// Server-only! Never import this in client code.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

### Pattern 2: Middleware for Token Refresh

**What:** Next.js middleware that refreshes Supabase auth tokens on every request.
**When to use:** Always -- this is required for SSR auth to work.

**`lib/supabase/middleware.ts`:**
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do NOT use getSession() -- it doesn't validate the token
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users to login (except auth pages and static assets)
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/reset-password') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/update-password')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

**Root `middleware.ts`:**
```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Pattern 3: Route Group Layouts for Role-Based Access

**What:** Server-side auth checks in route group layouts to enforce role-based access.
**When to use:** `(admin)` layout checks for admin role; `(dashboard)` layout checks for any authenticated user.

**`app/(admin)/layout.tsx` (admin guard):**
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check role from profiles table (or JWT claim)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/access-denied') // or show inline AccessDenied component
  }

  return <>{children}</>
}
```

### Pattern 4: Admin Creates Employee (Server Action)

**What:** Server Action using service-role client to create users.
**When to use:** AUTH-04 -- Admin creates employee accounts (no self-registration).

```typescript
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateEmployeeSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['employee', 'admin']).default('employee'),
})

export async function createEmployee(formData: FormData) {
  // 1. Verify caller is admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Forbidden')

  // 2. Validate input
  const parsed = CreateEmployeeSchema.parse({
    email: formData.get('email'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    role: formData.get('role') || 'employee',
  })

  // 3. Create user with admin client (service role)
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.auth.admin.createUser({
    email: parsed.email,
    email_confirm: true, // Auto-confirm since admin is creating
    user_metadata: {
      first_name: parsed.firstName,
      last_name: parsed.lastName,
    },
  })

  if (error) throw error

  // 4. The trigger on auth.users will auto-create the profile
  // 5. Update role if admin (trigger defaults to 'employee')
  if (parsed.role === 'admin') {
    await adminClient
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', data.user.id)
  }

  // 6. Send invite email (user sets their own password on first login)
  // Use inviteUserByEmail() OR resetPasswordForEmail() for initial password setup
}
```

### Pattern 5: Password Reset Flow

**What:** Three-step password reset using PKCE flow.
**When to use:** AUTH-02.

```typescript
// Step 1: Request reset (Server Action)
'use server'
export async function requestPasswordReset(email: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/update-password`,
  })
  if (error) throw error
}

// Step 2: Auth callback route handler exchanges code for session
// app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}

// Step 3: Update password (Server Action, user is now authenticated via reset link)
'use server'
export async function updatePassword(newPassword: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}
```

### Anti-Patterns to Avoid

- **Using `getSession()` on the server:** It reads cookies without validating the JWT. Always use `getUser()` for server-side auth checks.
- **Storing roles in `user_metadata`:** Users can modify their own `raw_user_meta_data`. Use a `profiles` table with RLS instead.
- **Client-side auth guards only:** Always enforce auth in Server Components/Actions. Client-side checks are UX, not security.
- **Exposing `service_role` key to the browser:** The admin client must only be used in Server Actions or Route Handlers. Never prefix with `NEXT_PUBLIC_`.
- **Skipping RLS on any table:** Every table must have RLS enabled in the same migration that creates it.
- **Using deprecated `@supabase/auth-helpers-nextjs`:** Use `@supabase/ssr` instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Authentication | Custom JWT/session system | Supabase Auth | Handles PKCE, token refresh, password hashing, email flows |
| Cookie-based SSR sessions | Manual cookie management | `@supabase/ssr` | Handles chunked cookies (>4KB JWTs), refresh logic, PKCE |
| Role in JWT claims | Manual JWT modification | Supabase Custom Access Token Hook | Runs at token issuance, maintained by Supabase |
| Row-level data security | Application-layer permission checks | Supabase RLS policies | Database-level enforcement; can't be bypassed by API calls |
| Password reset emails | Custom email sending | `supabase.auth.resetPasswordForEmail()` | Handles token generation, expiry, PKCE flow |
| User creation by admin | Custom registration endpoint | `supabase.auth.admin.createUser()` | Handles password hashing, metadata, email confirmation |
| Form validation | Manual if/else checking | Zod schemas | Type-safe, composable, works with Server Actions |

**Key insight:** Supabase provides the entire auth stack -- from signup through password reset through role-based access. The only custom code needed is the profiles table, the trigger, the access token hook, and the RLS policies.

## Common Pitfalls

### Pitfall 1: Using getSession() Instead of getUser() on Server
**What goes wrong:** `getSession()` reads the JWT from cookies but does NOT validate it with the Supabase Auth server. A tampered cookie could pass the check.
**Why it happens:** `getSession()` feels easier and is a habit from client-side code.
**How to avoid:** Always use `await supabase.auth.getUser()` in Server Components, Server Actions, Route Handlers, and middleware.
**Warning signs:** Auth checks using `getSession` in any server-side code.

### Pitfall 2: Trigger Failure Blocking Signups
**What goes wrong:** If the `handle_new_user` trigger (which creates the profile row) has a bug or constraint violation, the entire signup transaction rolls back -- the user is never created.
**Why it happens:** The trigger runs in the same transaction as the auth.users insert.
**How to avoid:** Keep the trigger simple (just insert id, role default). Test thoroughly. Use `SECURITY DEFINER` and set `search_path = ''` for security.
**Warning signs:** Signups failing silently or returning generic errors.

### Pitfall 3: Missing Middleware Causes Stale Sessions
**What goes wrong:** Without middleware calling `supabase.auth.getUser()` on every request, expired tokens are never refreshed. Users get randomly logged out.
**Why it happens:** Middleware is skipped or misconfigured matcher excludes routes that need auth.
**How to avoid:** Always include middleware with the correct matcher pattern. Test by closing/reopening browser (AUTH-01 requirement).
**Warning signs:** Users losing sessions after ~1 hour (access token expiry).

### Pitfall 4: RLS Policies Missing on New Tables
**What goes wrong:** Table is created without RLS. All data is publicly accessible via the anon key.
**Why it happens:** RLS is a separate step from CREATE TABLE. Easy to forget.
**How to avoid:** Enable RLS in the SAME migration that creates the table. Add at least one policy.
**Warning signs:** Any table without `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in its migration.

### Pitfall 5: Admin Routes Accessible Without Role Check
**What goes wrong:** Authenticated users (employees) can access admin pages because only auth is checked, not role.
**Why it happens:** Middleware only checks if user is logged in. Role checks need to happen in the layout/page or in RLS.
**How to avoid:** Layer auth: middleware for authentication, layout for role authorization, RLS for data access.
**Warning signs:** Employee can navigate to `/admin/*` routes.

### Pitfall 6: NEXT_PUBLIC_ Prefix on Secret Keys
**What goes wrong:** The `SUPABASE_SERVICE_ROLE_KEY` is exposed to the browser, allowing anyone to bypass RLS.
**Why it happens:** Developer copies the wrong env var naming convention.
**How to avoid:** Only `SUPABASE_URL` and `SUPABASE_ANON_KEY` get `NEXT_PUBLIC_` prefix. Service role key is NEVER prefixed.
**Warning signs:** `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

## Code Examples

### Database Schema (SQL Migration)

```sql
-- Enable necessary extensions
-- (uuid-ossp is usually pre-enabled in Supabase)

-- Create custom types
CREATE TYPE public.app_role AS ENUM ('admin', 'employee');

-- Create profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'employee',
  first_name TEXT,
  last_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Enable RLS immediately
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can insert profiles (for employee creation)
CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update profiles
CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'employee')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

### Custom Access Token Hook (Embeds Role in JWT)

```sql
-- This function is called by Supabase Auth before issuing a token
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims JSONB;
  user_role public.app_role;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = (event->>'user_id')::UUID;

  claims := event->'claims';

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  ELSE
    claims := jsonb_set(claims, '{user_role}', '"employee"');
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Grant permissions for the hook
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
GRANT ALL ON TABLE public.profiles TO supabase_auth_admin;

CREATE POLICY "Allow auth admin to read profiles"
  ON public.profiles
  AS PERMISSIVE FOR SELECT
  TO supabase_auth_admin
  USING (true);
```

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...         # Safe for browser
SUPABASE_SERVICE_ROLE_KEY=eyJ...              # Server-only! NEVER NEXT_PUBLIC_
NEXT_PUBLIC_SITE_URL=http://localhost:3000     # For redirect URLs
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | Auth helpers deprecated; all SSR frameworks use one package |
| `getSession()` for server auth | `getUser()` for server auth | 2024 | Security fix; getSession doesn't validate JWT |
| `get()`/`set()`/`remove()` cookies | `getAll()`/`setAll()` cookies | 2024 | Newer @supabase/ssr API; handles chunked cookies |
| localStorage sessions | Cookie-based sessions (PKCE) | 2024 | Required for SSR; PKCE is default in @supabase/ssr |
| Next.js 14 sync request APIs | Next.js 15 async request APIs | 2024 | `cookies()` must be awaited in Next.js 15 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 2025 | New key format; both work during transition |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr`
- `supabase.auth.getSession()` on server: Use `getUser()` instead
- Storing session in localStorage: Use cookie-based via `@supabase/ssr`
- `user_metadata` for roles: Use profiles table + RLS

**Version note:** Next.js 16 is now the latest major (16.1.x as of Feb 2026). The project specifies Next.js 15. Use the latest 15.x security patch (15.5.9+). The main difference from 16 is that 15 has temporary sync compatibility for request APIs while 16 removes it. Our code should use the async pattern (`await cookies()`) which works in both.

## Open Questions

1. **Supabase Project Setup**
   - What we know: Need a Supabase project with Auth enabled
   - What's unclear: Whether to use local development with `supabase init` + `supabase start` or remote project from the start
   - Recommendation: Use Supabase CLI for local development with migrations, push to remote for deployment

2. **Initial Admin User Seeding**
   - What we know: Admin creates employees (no self-registration). But who creates the first admin?
   - What's unclear: Bootstrap process for the very first admin account
   - Recommendation: Seed the first admin via Supabase Dashboard (create user + manually set role to 'admin' in profiles table) or via a one-time seed migration

3. **Email Provider for Password Reset**
   - What we know: Supabase has a built-in email provider (rate-limited, for development)
   - What's unclear: Whether the built-in provider is sufficient for demo or if a custom SMTP is needed
   - Recommendation: Built-in is fine for demo; configure custom SMTP (e.g., Resend) before production

4. **Custom Access Token Hook: Dashboard vs Migration**
   - What we know: The hook must be enabled in Supabase Dashboard under Authentication > Hooks
   - What's unclear: Whether this can be automated via migration/CLI or requires manual dashboard setup
   - Recommendation: Document as a manual setup step; include the SQL function in migrations

5. **Publishable Key vs Anon Key**
   - What we know: Supabase is transitioning from `anon` key to `publishable` key format
   - What's unclear: Whether existing Supabase projects still use anon key or have auto-migrated
   - Recommendation: Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` naming; both key formats work during transition

## Sources

### Primary (HIGH confidence)
- [Supabase SSR Auth Setup for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) - Client setup, middleware, auth flow
- [Supabase SSR Client Creation](https://supabase.com/docs/guides/auth/server-side/creating-a-client) - Browser and server client patterns
- [Supabase Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) - Access token hook, authorize function, RLS policies
- [Supabase Managing User Data](https://supabase.com/docs/guides/auth/managing-user-data) - Profiles table, trigger, metadata
- [Supabase admin.createUser()](https://supabase.com/docs/reference/javascript/auth-admin-createuser) - Admin API for user creation
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) - RLS fundamentals
- [Supabase Advanced SSR Guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide) - PKCE flow, cookie security
- [Next.js Authentication Guide](https://nextjs.org/docs/app/guides/authentication) - Route groups, middleware patterns
- [Next.js Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) - Layout organization

### Secondary (MEDIUM confidence)
- [@supabase/ssr npm](https://www.npmjs.com/package/@supabase/ssr) - Version 0.8.x confirmed
- [@supabase/supabase-js npm](https://www.npmjs.com/package/@supabase/supabase-js) - Version 2.90.x confirmed
- [Next.js Releases](https://github.com/vercel/next.js/releases) - Version 16.x is latest; 15.5.9 latest 15.x patch
- [Supabase resetPasswordForEmail](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail) - Password reset API
- [Server Actions vs Route Handlers](https://makerkit.dev/blog/tutorials/server-actions-vs-route-handlers) - When to use which

### Tertiary (LOW confidence)
- [Supabase API Key Issue #1568](https://github.com/supabase/supabase-js/issues/1568) - New publishable key format may have issues with service role clients (check if resolved)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Supabase docs, npm registries, locked project decisions
- Architecture: HIGH - Official Supabase SSR guide patterns, verified with multiple sources
- Database schema: HIGH - Official profiles table pattern from Supabase docs, RBAC guide
- Pitfalls: HIGH - Documented by Supabase (getSession vs getUser), community consensus
- Password reset flow: MEDIUM - PKCE flow has known edge cases in deployment (works locally, may need testing on Vercel)

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (30 days - stable stack, well-documented patterns)
