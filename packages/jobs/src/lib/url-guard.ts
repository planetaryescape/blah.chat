import type { LookupAddress } from "node:dns";
import { lookup as dnsLookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";

/**
 * SSRF guard for outbound fetches of user-supplied URLs.
 *
 * Note on TOCTOU: with plain `fetch` we cannot pin the resolved IP for the
 * actual connection, so a malicious DNS server could rebind between our check
 * and the request. Resolve-then-check plus re-validation on every redirect hop
 * is the accepted compromise here.
 */

type LookupFn = (
  hostname: string,
  options: { all: true; verbatim: true },
) => Promise<LookupAddress[]>;

export interface UrlGuardOptions {
  lookup?: LookupFn;
}

export class UrlGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UrlGuardError";
  }
}

/**
 * Returns true only for globally routable unicast addresses. ipaddr.js
 * classifies loopback, RFC1918 private, link-local (169.254/16, fe80::/10),
 * CGNAT (100.64/10), unique-local (fc00::/7), unspecified, broadcast, and
 * other reserved ranges as non-"unicast". `ipaddr.process` converts
 * IPv4-mapped IPv6 (::ffff:a.b.c.d) to IPv4 first, so mapped equivalents of
 * blocked ranges are rejected too.
 */
function isPublicAddress(address: string): boolean {
  let parsed: ReturnType<typeof ipaddr.process>;
  try {
    parsed = ipaddr.process(address);
  } catch {
    return false;
  }
  return parsed.range() === "unicast";
}

/**
 * Validates that a URL is http(s) and that its host resolves only to public
 * addresses. Rejects literal IP hostnames in private/reserved ranges and
 * hostnames whose DNS records include any such address. Returns the parsed
 * URL on success.
 */
export async function assertPublicHttpUrl(
  url: string,
  options: UrlGuardOptions = {},
): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new UrlGuardError(`Invalid URL: ${url}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UrlGuardError(
      `Blocked non-http(s) URL scheme: ${parsed.protocol}`,
    );
  }

  // WHATWG URL keeps brackets around IPv6 literals.
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");

  if (ipaddr.isValid(hostname)) {
    if (!isPublicAddress(hostname)) {
      throw new UrlGuardError(`Blocked non-public IP address: ${hostname}`);
    }
    return parsed;
  }

  const lookup: LookupFn = options.lookup ?? dnsLookup;
  let addresses: LookupAddress[];
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new UrlGuardError(`DNS resolution failed for host: ${hostname}`);
  }

  if (addresses.length === 0) {
    throw new UrlGuardError(`DNS resolution returned no records: ${hostname}`);
  }

  for (const record of addresses) {
    if (!isPublicAddress(record.address)) {
      throw new UrlGuardError(
        `Blocked host resolving to non-public address: ${hostname} -> ${record.address}`,
      );
    }
  }

  return parsed;
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export interface FetchPublicUrlOptions extends UrlGuardOptions {
  maxRedirects?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Fetches a URL with the SSRF guard applied, following up to `maxRedirects`
 * redirects manually and re-running the guard on every hop.
 */
export async function fetchPublicUrl(
  url: string,
  init: RequestInit = {},
  options: FetchPublicUrlOptions = {},
): Promise<Response> {
  const maxRedirects = options.maxRedirects ?? 3;
  const fetchImpl = options.fetchImpl ?? fetch;

  let current = await assertPublicHttpUrl(url, options);

  for (let redirects = 0; ; redirects += 1) {
    const response = await fetchImpl(current, { ...init, redirect: "manual" });

    if (!REDIRECT_STATUSES.has(response.status)) {
      return response;
    }

    const location = response.headers.get("location");
    if (!location) {
      return response;
    }

    if (redirects >= maxRedirects) {
      throw new UrlGuardError(`Too many redirects fetching ${url}`);
    }

    await response.body?.cancel();
    current = await assertPublicHttpUrl(
      new URL(location, current).href,
      options,
    );
  }
}
