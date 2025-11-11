import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Handle CORS preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const res = NextResponse.next()

  res.headers.append('Access-Control-Allow-Credentials', "true")
  res.headers.append('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || "")
  res.headers.append('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.headers.append(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  )

  return res
}

export const config = {
  matcher: '/:path*',
}
