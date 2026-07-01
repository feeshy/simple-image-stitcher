export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 1. Bot check: identify search engine crawlers and bypass redirect/cookie logic
  const userAgent = request.headers.get('user-agent') || '';
  const botRegex = /bot|spider|crawl|slurp|tracker|archiver|facebook|twitter|pinterest/i;
  const isBot = botRegex.test(userAgent);

  if (isBot) {
    return context.next();
  }

  // Define paths that correspond to pages (excluding static files, assets, sitemaps, etc.)
  const isDefaultLangPage = pathname === '/' || pathname === '/index.html';
  const isEnLangPage = pathname === '/en' || pathname === '/en.html' || pathname.startsWith('/en/');
  const isPage = isDefaultLangPage || isEnLangPage;

  if (!isPage) {
    return context.next();
  }

  // Helper to clone response and set cookie
  const setCookie = (response, value) => {
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Set-Cookie', `lang_pref=${value}; Path=/; Max-Age=31536000; Secure; SameSite=Lax`);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  };

  // 2. Manual language switcher check (?lang=...)
  const langParam = url.searchParams.get('lang');
  if (langParam) {
    url.searchParams.delete('lang');
    const redirectUrl = url.pathname + url.search;
    const response = Response.redirect(new URL(redirectUrl, request.url).toString(), 302);
    response.headers.set('Set-Cookie', `lang_pref=${langParam}; Path=/; Max-Age=31536000; Secure; SameSite=Lax`);
    return response;
  }

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

  // 3. Homepage language routing (for '/' or '/index.html')
  if (isDefaultLangPage) {
    if (langPref) {
      if (langPref === 'en') {
        const redirectUrl = new URL('/en' + url.search, request.url);
        return Response.redirect(redirectUrl.toString(), 302);
      }
      // If zh or other, let it pass
      return context.next();
    } else {
      // If no cookie preference, check Accept-Language header
      const acceptLang = request.headers.get('Accept-Language') || '';
      const firstLang = acceptLang.split(',')[0].trim().toLowerCase();
      if (firstLang.startsWith('en')) {
        const redirectUrl = new URL('/en' + url.search, request.url);
        const response = Response.redirect(redirectUrl.toString(), 302);
        response.headers.set('Set-Cookie', 'lang_pref=en; Path=/; Max-Age=31536000; Secure; SameSite=Lax');
        return response;
      } else {
        // Default to zh
        const response = await context.next();
        return setCookie(response, 'zh');
      }
    }
  }

  // 4. Subpage language preference update (for English pages)
  if (isEnLangPage) {
    const response = await context.next();
    // Quietly update preference to English if the user visits an English page directly
    if (langPref !== 'en') {
      return setCookie(response, 'en');
    }
    return response;
  }

  return context.next();
}
