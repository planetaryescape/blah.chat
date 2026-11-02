# Dependency release-age exceptions

Use the normal frozen install and audit to verify the locked dependencies:

```sh
agent-work run -- bun install --frozen-lockfile
agent-work run -- bun audit --prod --audit-level=high
```

## node-forge 1.4.2: one-time exception, 2026-11-02

The repository owner approved installing exactly `node-forge@1.4.2` before
the seven-day release-age threshold. Versions through 1.4.0 had six high
advisories; the fixed 1.4.1 and 1.4.2 releases were published on 2026-10-27.
The dependency is transitive through Expo tooling, not the web chat runtime.

`package.json` overrides node-forge to exactly `1.4.2`. The install retained
`minimumReleaseAge = 604800` for every other package. Bun 1.3.14 did not match
a version-qualified exclusion, so the install used a temporary package-name
exclusion while the exact root override constrained its only permitted version.
The temporary configuration was removed afterward. No repository or global
release-age exclusion remains, and no audit advisory was suppressed.

### Verified provenance

- [Registry metadata](https://registry.npmjs.org/node-forge/1.4.2): `node-forge@1.4.2`.
- Upstream: [digitalbazaar/forge, commit 7928054627d93ab8c0216b756246e8ca8d62a93e](https://github.com/digitalbazaar/forge/commit/7928054627d93ab8c0216b756246e8ca8d62a93e).
- The registry signature verified against the npm registry public key
  `SHA256:DhQ8wR5APBvFHLF/+Tc+AYvPOdTpcIDqOhxsBHRwC7U`.
- The downloaded tarball's SHA-512 digest matched both registry metadata and
  the committed `bun.lock` integrity value:

```text
sha512-rRtAR5XLJ8gCKd9du4qrKAsgCG1ObGP4gLeNJMa4vYSeq4bmBMOJk5IHkrviBV0q7uoAJlVd8HEQYQSVUb4FGQ==
```

After installation, the high/critical production audit exited 0 and the normal
frozen install passed without an exception. The lockfile changed only node-forge
and its override metadata; the preceding successful web build remains applicable.
