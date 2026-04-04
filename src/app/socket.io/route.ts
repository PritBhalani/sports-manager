import { NextResponse } from "next/server";

/**
 * Quiet Socket.IO probes (e.g. `GET /socket.io?EIO=4&transport=polling`).
 * This app does not run Socket.IO; without this route Next returns 404 for every poll.
 */
export function GET() {
  return new NextResponse(null, { status: 204 });
}

export function POST() {
  return new NextResponse(null, { status: 204 });
}
