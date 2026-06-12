import { describe, expect, it, vi } from "vitest";
import {
  assertPublicHttpUrl,
  fetchPublicUrl,
  UrlGuardError,
} from "./url-guard";

function fakeLookup(addresses: string[]) {
  return vi.fn(async () =>
    addresses.map((address) => ({
      address,
      family: address.includes(":") ? 6 : 4,
    })),
  ) as unknown as NonNullable<
    Parameters<typeof assertPublicHttpUrl>[1]
  >["lookup"];
}

describe("assertPublicHttpUrl", () => {
  it("rejects non-http(s) schemes", async () => {
    await expect(assertPublicHttpUrl("file:///etc/passwd")).rejects.toThrow(
      UrlGuardError,
    );
    await expect(assertPublicHttpUrl("ftp://example.com/x")).rejects.toThrow(
      UrlGuardError,
    );
    await expect(assertPublicHttpUrl("gopher://example.com/x")).rejects.toThrow(
      UrlGuardError,
    );
  });

  it("rejects invalid URLs", async () => {
    await expect(assertPublicHttpUrl("not a url")).rejects.toThrow(
      UrlGuardError,
    );
  });

  it.each([
    "http://127.0.0.1/",
    "http://127.8.9.10/",
    "http://10.0.0.1/",
    "http://172.16.0.1/",
    "http://172.31.255.255/",
    "http://192.168.1.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://100.64.0.1/",
    "http://0.0.0.0/",
    "http://255.255.255.255/",
    "http://[::1]/",
    "http://[::]/",
    "http://[fe80::1]/",
    "http://[fc00::1]/",
    "http://[fd12:3456::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://[::ffff:10.0.0.1]/",
    "http://[::ffff:192.168.1.1]/",
  ])("rejects literal non-public IP hostname %s", async (url) => {
    await expect(assertPublicHttpUrl(url)).rejects.toThrow(UrlGuardError);
  });

  it.each([
    "http://1.1.1.1/",
    "https://8.8.8.8/path?q=1",
    "https://[2606:4700:4700::1111]/",
  ])("accepts public literal IP %s", async (url) => {
    await expect(assertPublicHttpUrl(url)).resolves.toBeInstanceOf(URL);
  });

  it("rejects hostnames resolving to private addresses", async () => {
    await expect(
      assertPublicHttpUrl("https://internal.example.com/", {
        lookup: fakeLookup(["10.1.2.3"]),
      }),
    ).rejects.toThrow(UrlGuardError);
  });

  it("rejects hostnames where any record is non-public", async () => {
    await expect(
      assertPublicHttpUrl("https://mixed.example.com/", {
        lookup: fakeLookup(["93.184.216.34", "192.168.0.10"]),
      }),
    ).rejects.toThrow(UrlGuardError);
  });

  it("rejects hostnames resolving to loopback or link-local IPv6", async () => {
    await expect(
      assertPublicHttpUrl("https://v6.example.com/", {
        lookup: fakeLookup(["::1"]),
      }),
    ).rejects.toThrow(UrlGuardError);
    await expect(
      assertPublicHttpUrl("https://v6ll.example.com/", {
        lookup: fakeLookup(["fe80::dead:beef"]),
      }),
    ).rejects.toThrow(UrlGuardError);
  });

  it("rejects hostnames that fail DNS resolution", async () => {
    const lookup = vi.fn(async () => {
      throw new Error("ENOTFOUND");
    }) as unknown as NonNullable<
      Parameters<typeof assertPublicHttpUrl>[1]
    >["lookup"];

    await expect(
      assertPublicHttpUrl("https://missing.example.com/", { lookup }),
    ).rejects.toThrow(UrlGuardError);
  });

  it("accepts hostnames resolving only to public addresses", async () => {
    const url = await assertPublicHttpUrl("https://example.com/page", {
      lookup: fakeLookup([
        "93.184.216.34",
        "2606:2800:220:1:248:1893:25c8:1946",
      ]),
    });
    expect(url.hostname).toBe("example.com");
  });

  it("resolves localhost via real DNS and rejects it", async () => {
    await expect(assertPublicHttpUrl("http://localhost:3000/")).rejects.toThrow(
      UrlGuardError,
    );
  });
});

describe("fetchPublicUrl", () => {
  it("re-validates every redirect hop and blocks private targets", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(null, {
        status: 302,
        headers: { location: "http://169.254.169.254/latest/meta-data/" },
      });
    }) as unknown as typeof fetch;

    await expect(
      fetchPublicUrl(
        "https://example.com/start",
        {},
        { fetchImpl, lookup: fakeLookup(["93.184.216.34"]) },
      ),
    ).rejects.toThrow(UrlGuardError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("follows public redirects up to the limit then throws", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(null, {
        status: 301,
        headers: { location: "https://example.com/next" },
      });
    }) as unknown as typeof fetch;

    await expect(
      fetchPublicUrl(
        "https://example.com/start",
        {},
        { fetchImpl, lookup: fakeLookup(["93.184.216.34"]), maxRedirects: 3 },
      ),
    ).rejects.toThrow(/Too many redirects/);
    // initial request + 3 followed redirects
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it("returns the final non-redirect response", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const href = input instanceof URL ? input.href : String(input);
      if (href === "https://example.com/start") {
        return new Response(null, {
          status: 302,
          headers: { location: "/final" },
        });
      }
      return new Response("ok", { status: 200 });
    }) as unknown as typeof fetch;

    const response = await fetchPublicUrl(
      "https://example.com/start",
      {},
      { fetchImpl, lookup: fakeLookup(["93.184.216.34"]) },
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("ok");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("passes redirect: manual to the underlying fetch", async () => {
    const fetchImpl = vi.fn(async () => new Response("ok", { status: 200 }));

    await fetchPublicUrl(
      "https://example.com/",
      { headers: { "User-Agent": "test" } },
      {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        lookup: fakeLookup(["93.184.216.34"]),
      },
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        redirect: "manual",
        headers: { "User-Agent": "test" },
      }),
    );
  });
});
