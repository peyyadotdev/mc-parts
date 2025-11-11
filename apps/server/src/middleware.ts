import { NextResponse } from "next/server";

export function middleware() {
  const res = NextResponse.next()

  res.headers.append('Access-Control-Allow-Credentials', "true")
  // Security: Only set CORS origin if explicitly configured, otherwise omit header
  // An empty string would allow all origins, which is a security risk
  const corsOrigin = process.env.CORS_ORIGIN;
  if (corsOrigin) {
    res.headers.append('Access-Control-Allow-Origin', corsOrigin)
  }
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
