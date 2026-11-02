"use node";

// Adapted from origin/main packages/jobs/src/lib/url-guard.ts. Node's built-in
// BlockList avoids introducing a new package in the restored backend.
import { lookup as dnsLookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  blocked.addSubnet(address, prefix, "ipv4");
// Only global-unicast IPv6 is accepted, excluding special-purpose subranges.
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
blocked.addSubnet("2001::", 23, "ipv6");
blocked.addSubnet("2001:db8::", 32, "ipv6");
blocked.addSubnet("2002::", 16, "ipv6");
blocked.addSubnet("3fff::", 20, "ipv6");

export class UrlGuardError extends Error {}
interface Options {
  lookup?: (
    hostname: string,
    options: { all: true; verbatim: true },
  ) => Promise<{ address: string; family: number }[]>;
  fetchImpl?: typeof fetch;
  maxRedirects?: number;
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  if (family === 6)
    return globalV6.check(address, "ipv6") && !blocked.check(address, "ipv6");
  return false;
}

export async function assertPublicHttpUrl(
  url: string,
  options: Options = {},
): Promise<URL> {
  const parsed = new URL(url);
  if (
    !["https:", "http:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password
  )
    throw new UrlGuardError("Blocked URL scheme or credentials");
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
  if (isIP(hostname)) {
    if (!isPublicAddress(hostname))
      throw new UrlGuardError("Blocked non-public IP address");
    return parsed;
  }
  const records = options.lookup
    ? await options.lookup(hostname, { all: true, verbatim: true })
    : await dnsLookup(hostname, { all: true, verbatim: true });
  if (
    !records.length ||
    records.some(({ address }) => !isPublicAddress(address))
  )
    throw new UrlGuardError("Blocked host resolving to non-public address");
  return parsed;
}

// DNS is rechecked on every redirect; plain fetch cannot pin the checked IP,
// so the same documented DNS-rebinding limitation as the jobs guard applies.
export async function fetchPublicUrl(
  url: string,
  init: RequestInit = {},
  options: Options = {},
): Promise<Response> {
  let current = await assertPublicHttpUrl(url, options);
  const headers = new Headers(init.headers);
  for (let redirects = 0; ; redirects++) {
    const response = await (options.fetchImpl ?? fetch)(current, {
      ...init,
      headers,
      signal: init.signal ?? AbortSignal.timeout(15_000),
      redirect: "manual",
    });
    if (
      ![301, 302, 303, 307, 308].includes(response.status) ||
      !response.headers.get("location")
    )
      return response;
    await response.body?.cancel();
    if (redirects >= (options.maxRedirects ?? 3))
      throw new UrlGuardError("Too many redirects");
    const next = await assertPublicHttpUrl(
      new URL(response.headers.get("location")!, current).href,
      options,
    );
    if (next.origin !== current.origin) {
      for (const header of [
        "authorization",
        "cookie",
        "proxy-authorization",
        "host",
      ])
        headers.delete(header);
    }
    current = next;
  }
}
