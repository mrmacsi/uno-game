import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Check if locale cookie exists, if not set default to 'en'
  const locale = request.cookies.get('NEXT_LOCALE')?.value || 'en';
  
  // Create response
  const response = NextResponse.next();
  
  // Set locale cookie if not present
  if (!request.cookies.has('NEXT_LOCALE')) {
    response.cookies.set('NEXT_LOCALE', locale);
  }
  
  return response;
}

export const config = {
  // Skip all paths that should not be internationalized
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};

