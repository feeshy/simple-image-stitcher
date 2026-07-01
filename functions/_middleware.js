export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 1. SW Bypass check: If sw-bypass=1 parameter is present, bypass all redirection
  if (url.searchParams.get('sw-bypass') === '1') {
    return context.next();
  }

  // 2. Bot check: search engine crawlers bypass redirection to guarantee indexing of all pages
  const userAgent = request.headers.get('user-agent') || '';
  const botRegex = /bot|spider|crawl|slurp|tracker|archiver|facebook|twitter|pinterest/i;
  const isBot = botRegex.test(userAgent);
  if (isBot) {
    return context.next();
  }

  // 3. One-way entry routing: ONLY redirect on the root path
  const isRoot = pathname === '/' || pathname === '/index.html';
  if (isRoot) {
    // Parse Cookie for preference
    const cookieHeader = request.headers.get('Cookie') || '';
    let langPref = null;
    const cookies = cookieHeader.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'lang_pref') {
        langPref = value;
        break;
      }
    }

    if (langPref) {
      // If preference is English, redirect to /en
      if (langPref === 'en') {
        const redirectUrl = new URL('/en' + url.search, request.url);
        return Response.redirect(redirectUrl.toString(), 302);
      }
      // If preference is zh (default), serve root directly without redirection
      return context.next();
    } else {
      // First visit (no preference cookie): read Accept-Language header
      const acceptLang = request.headers.get('Accept-Language') || '';
      const firstLang = acceptLang.split(',')[0].trim().toLowerCase();
      if (firstLang.startsWith('zh')) {
        // Stay on zh, serve root directly, and set the default preference cookie
        const response = await context.next();
        const newHeaders = new Headers(response.headers);
        newHeaders.set('Set-Cookie', 'lang_pref=zh; Path=/; Max-Age=31536000; Secure; SameSite=Lax');
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders
        });
      } else {
        // Any other language: redirect to English /en and set preference cookie
        const redirectUrl = new URL('/en' + url.search, request.url);
        const response = Response.redirect(redirectUrl.toString(), 302);
        response.headers.set('Set-Cookie', 'lang_pref=en; Path=/; Max-Age=31536000; Secure; SameSite=Lax');
        return response;
      }
    }
  }

  // All other specific subpaths (like /en) serve directly to respect specific URL visits
  return context.next();
}
