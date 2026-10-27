import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { isSessionOptionalPath } from "@/lib/auth-paths";

const COOKIE_NAME = "tidynest_session";

function getSecret() {
  return new TextEncoder().encode(process.env.SESSION_SECRET ?? "");
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isSessionOptionalPath(pathname)) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    await jwtVerify(token, getSecret());
    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
