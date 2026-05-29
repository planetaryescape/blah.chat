# Changelog

## [0.7.6](https://github.com/planetaryescape/blah.chat/compare/jobs-v0.7.5...jobs-v0.7.6) (2026-05-29)


### Bug Fixes

* align drizzle workspace versions ([d73459c](https://github.com/planetaryescape/blah.chat/commit/d73459c61bc83c40656e3bbe37281ca2646334e2))

## [0.7.5](https://github.com/planetaryescape/blah.chat/compare/jobs-v0.7.4...jobs-v0.7.5) (2026-05-16)


### Bug Fixes

* allow Trigger internal process callbacks ([7322723](https://github.com/planetaryescape/blah.chat/commit/73227237470441058ccf03717dd98dd51f6c7a24))

## [0.7.4](https://github.com/planetaryescape/blah.chat/compare/jobs-v0.7.3...jobs-v0.7.4) (2026-05-15)


### Bug Fixes

* unblock Trigger schedule pruning ([3ff4507](https://github.com/planetaryescape/blah.chat/commit/3ff450767c3b5668a22bc5c6c4c8b3dd29e28e3b))

## [0.7.3](https://github.com/planetaryescape/blah.chat/compare/jobs-v0.7.2...jobs-v0.7.3) (2026-05-15)


### Bug Fixes

* sync deleted trigger schedules ([bf70f3f](https://github.com/planetaryescape/blah.chat/commit/bf70f3faec617f2c51d482209f4dff8f49c61f74))

## [0.7.2](https://github.com/planetaryescape/blah.chat/compare/jobs-v0.7.1...jobs-v0.7.2) (2026-05-15)


### Bug Fixes

* stabilize trigger deployments ([a1a1aef](https://github.com/planetaryescape/blah.chat/commit/a1a1aef945615533e59ddade4a8240e0629225cd))

## [0.7.1](https://github.com/planetaryescape/blah.chat/compare/jobs-v0.7.0...jobs-v0.7.1) (2026-05-14)


### Bug Fixes

* reduce trigger schedule usage ([4b9b1d1](https://github.com/planetaryescape/blah.chat/commit/4b9b1d1b17f9676d059ddeaf1eb8be8e93d06da5))

## [0.7.0](https://github.com/planetaryescape/blah.chat/compare/jobs-v0.6.0...jobs-v0.7.0) (2026-05-07)


### Features

* **jobs:** processGenerationTask drives generation via internal endpoint ([7f7bc55](https://github.com/planetaryescape/blah.chat/commit/7f7bc55afac9bf8393e4b9d769fa455e13e9058e))
* **jobs:** recoverStuckGenerationsTask cron re-enqueues stale requests ([8c1e554](https://github.com/planetaryescape/blah.chat/commit/8c1e5547e08aa91f19febf0c2b4852dfa8c1d876))

## [0.6.0](https://github.com/planetaryescape/blah.chat/compare/jobs-v0.5.0...jobs-v0.6.0) (2026-05-07)


### Features

* **jobs:** daily reconcile-clerk-users cron ([16f9717](https://github.com/planetaryescape/blah.chat/commit/16f971756959b6d3fbe10484ab9db3fc97a478b5))


### Bug Fixes

* drop server-only from clerk identity helpers + collapse readers ([96930f2](https://github.com/planetaryescape/blah.chat/commit/96930f2cd6b39efbc6128caee1843205ddefa964))

## [0.5.0](https://github.com/planetaryescape/blah.chat/compare/jobs-v0.4.1...jobs-v0.5.0) (2026-05-04)


### Features

* [] add backfill-embeddings trigger tasks ([8706e6b](https://github.com/planetaryescape/blah.chat/commit/8706e6b28895b502a7702601939d449adca0405e))
* [] add BYOD health check and migration runner scheduled tasks ([9353d43](https://github.com/planetaryescape/blah.chat/commit/9353d43cfe155299c8e39548697f60d2258d13ed))
* [] add cleanup and monitoring scheduled tasks ([63913a2](https://github.com/planetaryescape/blah.chat/commit/63913a2a2fbebcb0cb2b50565d3ca041d6db3e58))
* [] add data integrity scheduled tasks ([a623156](https://github.com/planetaryescape/blah.chat/commit/a623156773203fd2f16a858787e0f55e2b6fc189))
* [] add embed-message, embed-note, embed-task trigger jobs ([dd38b7d](https://github.com/planetaryescape/blah.chat/commit/dd38b7d7e9864179f7835b832e9eae01225010b4))
* [] add memory and extraction scheduled tasks ([e7ea42b](https://github.com/planetaryescape/blah.chat/commit/e7ea42b29662acf68cc0852326ffe89bbe7a6085))
* [] add provider health cron job ([95d9e60](https://github.com/planetaryescape/blah.chat/commit/95d9e606726c37eb211f771440e82e3c4c28eea2))
* [] add Slack alerting, k6 load tests, and mark all phases complete ([97f2cd7](https://github.com/planetaryescape/blah.chat/commit/97f2cd7bc90e7a0cf71a0d4a522011af4b9527ae))
* [] add trigger jobs and transport client ([974cbf4](https://github.com/planetaryescape/blah.chat/commit/974cbf4ccadf2353f0e3bf869ec078f316ca72b4))
* [] export all 24 task types from jobs package index ([abd51cb](https://github.com/planetaryescape/blah.chat/commit/abd51cb056bdab988d308ea00c18773c9c3e19ec))
* [] move blob flows to r2 and postgres ([eeba2c1](https://github.com/planetaryescape/blah.chat/commit/eeba2c172b4ddc8c298cdda6ff3d8ed222ce0bb5))
* add check-metrics-thresholds scheduled job ([aeb7682](https://github.com/planetaryescape/blah.chat/commit/aeb7682e2c643f54ab6e6156236c620f4009e04e))
* add trigger.dev task definitions for tiers 1-3 ([599a032](https://github.com/planetaryescape/blah.chat/commit/599a0324847e4484ff6846e08c576dd7cb192501))


### Bug Fixes

* [] compute percentSaved from MODEL_CONFIG in analyze-model-fit test ([dcb2efc](https://github.com/planetaryescape/blah.chat/commit/dcb2efc48ffa1a164a4e5297622448fb7f1c8672))
* [] increase test timeouts for CI across PGlite packages ([ab29534](https://github.com/planetaryescape/blah.chat/commit/ab295349592d67b69b9e83ae74a920500065dd36))
* add fetch timeout to trigger utils and forward jobId in embed-file ([bd5ec11](https://github.com/planetaryescape/blah.chat/commit/bd5ec11077672327908f1c0e7ed6e714996f6325))
* address review feedback and CI failures ([8b4f5ec](https://github.com/planetaryescape/blah.chat/commit/8b4f5ecb2b8de5b2319749e5b39f7881aa30d5d2))
* cast Buffer to Uint8Array for createDecipheriv ([26e65f3](https://github.com/planetaryescape/blah.chat/commit/26e65f34bec0915112c85d25220fa945696ab8db))
* commit lockfile and package.json changes for trigger.dev deps ([f0af5ed](https://github.com/planetaryescape/blah.chat/commit/f0af5ed2dadaaf11314cd764071f10659f46f95d))

## [0.4.1](https://github.com/planetaryescape/blah.chat/compare/jobs-v0.4.0...jobs-v0.4.1) (2026-05-04)


### Bug Fixes

* cast Buffer to Uint8Array for createDecipheriv ([26e65f3](https://github.com/planetaryescape/blah.chat/commit/26e65f34bec0915112c85d25220fa945696ab8db))

## [0.4.0](https://github.com/planetaryescape/blah.chat/compare/jobs-v0.3.0...jobs-v0.4.0) (2026-03-29)


### Features

* [] add backfill-embeddings trigger tasks ([8706e6b](https://github.com/planetaryescape/blah.chat/commit/8706e6b28895b502a7702601939d449adca0405e))
* [] add BYOD health check and migration runner scheduled tasks ([9353d43](https://github.com/planetaryescape/blah.chat/commit/9353d43cfe155299c8e39548697f60d2258d13ed))
* [] add cleanup and monitoring scheduled tasks ([63913a2](https://github.com/planetaryescape/blah.chat/commit/63913a2a2fbebcb0cb2b50565d3ca041d6db3e58))
* [] add data integrity scheduled tasks ([a623156](https://github.com/planetaryescape/blah.chat/commit/a623156773203fd2f16a858787e0f55e2b6fc189))
* [] add embed-message, embed-note, embed-task trigger jobs ([dd38b7d](https://github.com/planetaryescape/blah.chat/commit/dd38b7d7e9864179f7835b832e9eae01225010b4))
* [] add memory and extraction scheduled tasks ([e7ea42b](https://github.com/planetaryescape/blah.chat/commit/e7ea42b29662acf68cc0852326ffe89bbe7a6085))
* [] add provider health cron job ([95d9e60](https://github.com/planetaryescape/blah.chat/commit/95d9e606726c37eb211f771440e82e3c4c28eea2))
* [] add Slack alerting, k6 load tests, and mark all phases complete ([97f2cd7](https://github.com/planetaryescape/blah.chat/commit/97f2cd7bc90e7a0cf71a0d4a522011af4b9527ae))
* [] add trigger jobs and transport client ([974cbf4](https://github.com/planetaryescape/blah.chat/commit/974cbf4ccadf2353f0e3bf869ec078f316ca72b4))
* [] export all 24 task types from jobs package index ([abd51cb](https://github.com/planetaryescape/blah.chat/commit/abd51cb056bdab988d308ea00c18773c9c3e19ec))
* [] move blob flows to r2 and postgres ([eeba2c1](https://github.com/planetaryescape/blah.chat/commit/eeba2c172b4ddc8c298cdda6ff3d8ed222ce0bb5))
* add check-metrics-thresholds scheduled job ([aeb7682](https://github.com/planetaryescape/blah.chat/commit/aeb7682e2c643f54ab6e6156236c620f4009e04e))
* add trigger.dev task definitions for tiers 1-3 ([599a032](https://github.com/planetaryescape/blah.chat/commit/599a0324847e4484ff6846e08c576dd7cb192501))


### Bug Fixes

* [] compute percentSaved from MODEL_CONFIG in analyze-model-fit test ([dcb2efc](https://github.com/planetaryescape/blah.chat/commit/dcb2efc48ffa1a164a4e5297622448fb7f1c8672))
* [] increase test timeouts for CI across PGlite packages ([ab29534](https://github.com/planetaryescape/blah.chat/commit/ab295349592d67b69b9e83ae74a920500065dd36))
* add fetch timeout to trigger utils and forward jobId in embed-file ([bd5ec11](https://github.com/planetaryescape/blah.chat/commit/bd5ec11077672327908f1c0e7ed6e714996f6325))
* address review feedback and CI failures ([8b4f5ec](https://github.com/planetaryescape/blah.chat/commit/8b4f5ecb2b8de5b2319749e5b39f7881aa30d5d2))
* commit lockfile and package.json changes for trigger.dev deps ([f0af5ed](https://github.com/planetaryescape/blah.chat/commit/f0af5ed2dadaaf11314cd764071f10659f46f95d))

## [0.3.0](https://github.com/planetaryescape/blah.chat/compare/jobs-v0.2.0...jobs-v0.3.0) (2026-03-29)


### Features

* [] add backfill-embeddings trigger tasks ([8706e6b](https://github.com/planetaryescape/blah.chat/commit/8706e6b28895b502a7702601939d449adca0405e))
* [] add BYOD health check and migration runner scheduled tasks ([9353d43](https://github.com/planetaryescape/blah.chat/commit/9353d43cfe155299c8e39548697f60d2258d13ed))
* [] add cleanup and monitoring scheduled tasks ([63913a2](https://github.com/planetaryescape/blah.chat/commit/63913a2a2fbebcb0cb2b50565d3ca041d6db3e58))
* [] add data integrity scheduled tasks ([a623156](https://github.com/planetaryescape/blah.chat/commit/a623156773203fd2f16a858787e0f55e2b6fc189))
* [] add embed-message, embed-note, embed-task trigger jobs ([dd38b7d](https://github.com/planetaryescape/blah.chat/commit/dd38b7d7e9864179f7835b832e9eae01225010b4))
* [] add memory and extraction scheduled tasks ([e7ea42b](https://github.com/planetaryescape/blah.chat/commit/e7ea42b29662acf68cc0852326ffe89bbe7a6085))
* [] add provider health cron job ([95d9e60](https://github.com/planetaryescape/blah.chat/commit/95d9e606726c37eb211f771440e82e3c4c28eea2))
* [] add Slack alerting, k6 load tests, and mark all phases complete ([97f2cd7](https://github.com/planetaryescape/blah.chat/commit/97f2cd7bc90e7a0cf71a0d4a522011af4b9527ae))
* [] add trigger jobs and transport client ([974cbf4](https://github.com/planetaryescape/blah.chat/commit/974cbf4ccadf2353f0e3bf869ec078f316ca72b4))
* [] export all 24 task types from jobs package index ([abd51cb](https://github.com/planetaryescape/blah.chat/commit/abd51cb056bdab988d308ea00c18773c9c3e19ec))
* [] move blob flows to r2 and postgres ([eeba2c1](https://github.com/planetaryescape/blah.chat/commit/eeba2c172b4ddc8c298cdda6ff3d8ed222ce0bb5))
* add check-metrics-thresholds scheduled job ([aeb7682](https://github.com/planetaryescape/blah.chat/commit/aeb7682e2c643f54ab6e6156236c620f4009e04e))


### Bug Fixes

* [] compute percentSaved from MODEL_CONFIG in analyze-model-fit test ([dcb2efc](https://github.com/planetaryescape/blah.chat/commit/dcb2efc48ffa1a164a4e5297622448fb7f1c8672))
* [] increase test timeouts for CI across PGlite packages ([ab29534](https://github.com/planetaryescape/blah.chat/commit/ab295349592d67b69b9e83ae74a920500065dd36))

## [0.2.0](https://github.com/planetaryescape/blah.chat/compare/jobs-v0.1.0...jobs-v0.2.0) (2026-03-13)


### Features

* add trigger.dev task definitions for tiers 1-3 ([599a032](https://github.com/planetaryescape/blah.chat/commit/599a0324847e4484ff6846e08c576dd7cb192501))


### Bug Fixes

* add fetch timeout to trigger utils and forward jobId in embed-file ([bd5ec11](https://github.com/planetaryescape/blah.chat/commit/bd5ec11077672327908f1c0e7ed6e714996f6325))
* address review feedback and CI failures ([8b4f5ec](https://github.com/planetaryescape/blah.chat/commit/8b4f5ecb2b8de5b2319749e5b39f7881aa30d5d2))
* commit lockfile and package.json changes for trigger.dev deps ([f0af5ed](https://github.com/planetaryescape/blah.chat/commit/f0af5ed2dadaaf11314cd764071f10659f46f95d))
