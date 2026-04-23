import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: { headers: req.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n) => req.cookies.get(n)?.value,
        set: (n, v, o) => { req.cookies.set({ name: n, value: v, ...o }); res.cookies.set({ name: n, value: v, ...o }); },
        remove: (n, o) => { req.cookies.set({ name: n, value: '', ...o }); res.cookies.set({ name: n, value: '', ...o }); },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;
  const isAuth = path.startsWith('/auth');
  const isApi = path.startsWith('/api');

  if (!user && !isAuth && !isApi) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth/signin';
    return NextResponse.redirect(url);
  }
  if (user && path === '/auth/signin') {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-.*\\.png|manifest.json|sw.js|workbox-.*).*)'],
};
