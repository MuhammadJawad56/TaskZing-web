import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Mock auth check - replace with real auth logic later
function isAuthenticated(request: NextRequest): boolean {
  // Check for auth token in cookies or headers
  const token = request.cookies.get("auth-token");
  return !!token?.value;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect dashboard routes
  if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated(request)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect authenticated users away from auth pages
  if (pathname.startsWith("/login") || pathname.startsWith("/signup")) {
    if (isAuthenticated(request)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/signup",
    "/forgot-password",
  ],
};

