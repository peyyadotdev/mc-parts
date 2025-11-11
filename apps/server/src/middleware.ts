import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const res = NextResponse.next()

  const corsOrigin = process.env.CORS_ORIGIN;
  
  // Only set CORS headers if CORS_ORIGIN is configured
  // Empty string would allow any origin, which is a security risk
  if (corsOrigin) {
    res.headers.append('Access-Control-Allow-Credentials', "true")
    res.headers.append('Access-Control-Allow-Origin', corsOrigin)
    res.headers.append('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.headers.append(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    )

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: res.headers })
    }
  }

  return res
}

export const config = {
  matcher: '/:path*',
}
