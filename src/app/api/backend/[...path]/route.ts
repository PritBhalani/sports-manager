import { NextRequest, NextResponse } from "next/server";
import { apiConfig } from "@/config/api.config";

const FORWARDED_REQUEST_HEADERS = [
  "authorization",
  "content-type",
  "primary-token",
  "token",
  "content-decoding",
] as const;

function buildUpstreamUrl(path: string[], request: NextRequest): string {
  const targetPath = path.map(encodeURIComponent).join("/");
  const url = new URL(
    `${apiConfig.upstreamBaseUrl.replace(/\/+$/, "")}/${targetPath}`,
  );

  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  return url.toString();
}

function buildForwardHeaders(request: NextRequest): Headers {
  const headers = new Headers();

  FORWARDED_REQUEST_HEADERS.forEach((name) => {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  });

  return headers;
}

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const upstreamUrl = buildUpstreamUrl(path, request);
  const method = request.method;
  const headers = buildForwardHeaders(request);

  const init: RequestInit = {
    method,
    headers,
    redirect: "manual",
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = await request.text();
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, init);
  } catch (err) {
    // Upstream can temporarily fail (timeout / network issues). Returning a
    // consistent JSON envelope prevents the client from crashing on `fetch failed`.
    const message =
      err instanceof Error ? err.message : "Upstream request failed";
    return NextResponse.json(
      { success: false, messages: [message], data: null, wsMessageType: 0 },
      { status: 200 },
    );
  }
  const responseHeaders = new Headers();
  const contentType = upstreamResponse.headers.get("content-type");

  if (contentType) {
    responseHeaders.set("content-type", contentType);
  }

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, context);
}
