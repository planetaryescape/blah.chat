# Changelog

## [1.36.0](https://github.com/planetaryescape/blah.chat/compare/v1.35.2...v1.36.0) (2026-03-30)


### Features

* [] add AES-256-GCM encryption for BYOD connection strings ([5ddd5cb](https://github.com/planetaryescape/blah.chat/commit/5ddd5cbaf13733063d4bcc3205401d15176022f2))
* [] add backfill-embeddings trigger tasks ([8706e6b](https://github.com/planetaryescape/blah.chat/commit/8706e6b28895b502a7702601939d449adca0405e))
* [] add BYOD health check and migration runner scheduled tasks ([9353d43](https://github.com/planetaryescape/blah.chat/commit/9353d43cfe155299c8e39548697f60d2258d13ed))
* [] add BYOD Neon connection validation, migration runner, and resolver ([3af38e5](https://github.com/planetaryescape/blah.chat/commit/3af38e5e010aee68954a942b9bfdcd66bd6823b0))
* [] add BYOD Neon persistence layer and REST API routes ([0e2d6e9](https://github.com/planetaryescape/blah.chat/commit/0e2d6e9612b31fabd142152bdc54b8d0a7ada338))
* [] add BYOD Neon schema tables and migration ([76ddd42](https://github.com/planetaryescape/blah.chat/commit/76ddd42c90638692839da263d8c464e52b2b24e2))
* [] add BYOD Neon settings UI, config hook, and connection blocker ([40200b0](https://github.com/planetaryescape/blah.chat/commit/40200b047a0f5d67df14a577b068144f240b9be2))
* [] add cleanup and monitoring scheduled tasks ([63913a2](https://github.com/planetaryescape/blah.chat/commit/63913a2a2fbebcb0cb2b50565d3ca041d6db3e58))
* [] add comparison feedback, regeneration tracking, and token fields to repository ([65b8b01](https://github.com/planetaryescape/blah.chat/commit/65b8b018a24459f349c875a24736c98375c1edd0))
* [] add comparison group state API ([72359a3](https://github.com/planetaryescape/blah.chat/commit/72359a3006fb8888c3b083db0e7954cb04a2617a))
* [] add Convex-to-Postgres migration tooling ([c20c0ea](https://github.com/planetaryescape/blah.chat/commit/c20c0ea6a47cb22553e48721e0507f4abceaa290))
* [] add data integrity scheduled tasks ([a623156](https://github.com/planetaryescape/blah.chat/commit/a623156773203fd2f16a858787e0f55e2b6fc189))
* [] add embed-message, embed-note, embed-task trigger jobs ([dd38b7d](https://github.com/planetaryescape/blah.chat/commit/dd38b7d7e9864179f7835b832e9eae01225010b4))
* [] add epsilon-greedy exploration policy ([1f78403](https://github.com/planetaryescape/blah.chat/commit/1f78403cbef0c3dfd435320b24624036817bc094))
* [] add knowledge search and feedback surface ([1520b9f](https://github.com/planetaryescape/blah.chat/commit/1520b9f50b63b3cc59decf2c4bd5ca047071fbf7))
* [] add memory and extraction scheduled tasks ([e7ea42b](https://github.com/planetaryescape/blah.chat/commit/e7ea42b29662acf68cc0852326ffe89bbe7a6085))
* [] add pgvector type, search utils, and FTS migration ([14e6e9c](https://github.com/planetaryescape/blah.chat/commit/14e6e9ca95df9cfe9772dc54691fa577b13fe4b2))
* [] add policy engine types and default weights ([58d87d4](https://github.com/planetaryescape/blah.chat/commit/58d87d41d36ddaad58a6ced7a54e636a447dcde4))
* [] add provider health cron job ([95d9e60](https://github.com/planetaryescape/blah.chat/commit/95d9e606726c37eb211f771440e82e3c4c28eea2))
* [] add shadow evaluator and widen policy engine feedback signals ([138e26e](https://github.com/planetaryescape/blah.chat/commit/138e26ef4a672b8ce5c84111af3fd7dfdc037189))
* [] add Slack alerting, k6 load tests, and mark all phases complete ([97f2cd7](https://github.com/planetaryescape/blah.chat/commit/97f2cd7bc90e7a0cf71a0d4a522011af4b9527ae))
* [] add trigger jobs and transport client ([974cbf4](https://github.com/planetaryescape/blah.chat/commit/974cbf4ccadf2353f0e3bf869ec078f316ca72b4))
* [] add usage tracking to generation provider ([cfc14e0](https://github.com/planetaryescape/blah.chat/commit/cfc14e0d3491995164f2a223463217b9c865aefd))
* [] cut cli chat to generation-v2 ([d2e8af3](https://github.com/planetaryescape/blah.chat/commit/d2e8af36daafcb5d10c7ab261011cb8c9f44465d))
* [] export all 24 task types from jobs package index ([abd51cb](https://github.com/planetaryescape/blah.chat/commit/abd51cb056bdab988d308ea00c18773c9c3e19ec))
* [] export policy engine and exploration from auto-router ([9129b63](https://github.com/planetaryescape/blah.chat/commit/9129b63ea0f0a6435b83a52a083d41e8f9617203))
* [] extract policy engine scoring and data helpers ([e04552e](https://github.com/planetaryescape/blah.chat/commit/e04552ebe22bb7753080ed10f44aae703f199fbe))
* [] finish comparison mode UI ([45e9c1a](https://github.com/planetaryescape/blah.chat/commit/45e9c1aad5ce6f1983789cf532ad4620c354d0e4))
* [] migrate chat and conversation surface ([3f8ea0a](https://github.com/planetaryescape/blah.chat/commit/3f8ea0a87db27f929a7c1f6be27f9067d9b17223))
* [] migrate notes and tasks workspace ([4a89691](https://github.com/planetaryescape/blah.chat/commit/4a896915c511b5b8af3bb6cc0243c1d39f18ad3e))
* [] migrate project notes and tasks ([eae51e6](https://github.com/planetaryescape/blah.chat/commit/eae51e676e9accd76dae722051adfe4ef7fdf123))
* [] move blob flows to r2 and postgres ([eeba2c1](https://github.com/planetaryescape/blah.chat/commit/eeba2c172b4ddc8c298cdda6ff3d8ed222ce0bb5))
* [] refresh GPT and OpenRouter models ([59c554f](https://github.com/planetaryescape/blah.chat/commit/59c554f6cb22dc49f3f67caa88a65c9787ea224a))
* [] wire embedding generation into creation paths ([bc587a7](https://github.com/planetaryescape/blah.chat/commit/bc587a7f5ad02104f00e81407e5c5d0fb35125d9))
* [] wire regeneration signal into routing feedback ([c42f564](https://github.com/planetaryescape/blah.chat/commit/c42f56461778bf69793358e56354ce41d32ac4dd))
* add auto router enabled setting with analytics ([efaad60](https://github.com/planetaryescape/blah.chat/commit/efaad60bfa4255f3d41d6b6c97d0c687041ffcc0))
* add chat-ui-core shared package for slash commands and draft persistence ([b47b0d6](https://github.com/planetaryescape/blah.chat/commit/b47b0d69705238389405dbfc575e43b4922d31f8))
* add check-metrics-thresholds scheduled job ([aeb7682](https://github.com/planetaryescape/blah.chat/commit/aeb7682e2c643f54ab6e6156236c620f4009e04e))
* add desktop app shell and automated release pipeline ([6dddde1](https://github.com/planetaryescape/blah.chat/commit/6dddde1e62a3d520e3d3e4a856f88e10ff74fe4c))
* add generateImageAction public wrapper delegating to trigger.dev ([98031e8](https://github.com/planetaryescape/blah.chat/commit/98031e8c047b3a47cfa3479eaaceaf495652436c))
* add MetricsCollector observability module ([ff888a3](https://github.com/planetaryescape/blah.chat/commit/ff888a3ad9233c245280d53f6785d50b81794091))
* add slash commands, draft persistence, and scroll improvements ([5f6e852](https://github.com/planetaryescape/blah.chat/commit/5f6e852c676cceb2eea2b883b756b35ed49a0cd6))
* add trigger.dev enqueueTask helper and HTTP webhook routes ([d691483](https://github.com/planetaryescape/blah.chat/commit/d69148351b905d1fa2d41ff6a5f840fe4b2ec107))
* add trigger.dev task definitions for tiers 1-3 ([599a032](https://github.com/planetaryescape/blah.chat/commit/599a0324847e4484ff6846e08c576dd7cb192501))
* **admin:** add last-active tracking and daily activity log ([02a530f](https://github.com/planetaryescape/blah.chat/commit/02a530f6c985da2e5622dca82c6657b352d29733))
* **admin:** add router mode selector and classifier settings to dashboard ([668b15e](https://github.com/planetaryescape/blah.chat/commit/668b15e573f8bea0dd59e7ff0ea4b30a2c34c483))
* **admin:** replace router model select with combobox ([d47e43f](https://github.com/planetaryescape/blah.chat/commit/d47e43f568ff81aedb222181bb9df9ed07ff2cd4))
* **admin:** use select dropdown for router model setting ([da87bdf](https://github.com/planetaryescape/blah.chat/commit/da87bdf14656c1c88a2473f0674be95b14604ccb))
* **api:** harden authz and portable SSE ([3467a01](https://github.com/planetaryescape/blah.chat/commit/3467a014321477240fa8884a25959f6b1b4ecfe1))
* **auto-router:** add classifier-based model router ([a72cf45](https://github.com/planetaryescape/blah.chat/commit/a72cf454ef0af9f149588a19f9219d816026cbc8))
* **auto-router:** add EmbeddingProvider, ModelRegistry, and Router factory ([8273263](https://github.com/planetaryescape/blah.chat/commit/8273263e7e175dc2a8509134acbef8f936b7b69a))
* **backend:** add tool result data boundary for prompt injection protection ([f9334d2](https://github.com/planetaryescape/blah.chat/commit/f9334d22b196df799762284a7486e14ef0018300))
* **chat:** add per-chat integration scope ([e0f0561](https://github.com/planetaryescape/blah.chat/commit/e0f056123509bdd7ab59863cf43d3e2636fddbc4))
* **cli:** add debug command and fix search query param ([d270926](https://github.com/planetaryescape/blah.chat/commit/d2709268110dac3475c2dc5f06783a56f9a1f029))
* **cli:** add multi-platform distribution support ([98feff1](https://github.com/planetaryescape/blah.chat/commit/98feff15dfb5da02146f89bd1e47e71ea6019935))
* **cli:** add release workflow and compile script ([85e1f09](https://github.com/planetaryescape/blah.chat/commit/85e1f09ace8a72d74eb66d0de9181ace3c72c650))
* **cli:** add tree-sitter syntax highlighting support ([e4bc651](https://github.com/planetaryescape/blah.chat/commit/e4bc651c1b7c43c4798151c3db343fbe68cc112d))
* **clients:** migrate clients to SDK transport ([864908c](https://github.com/planetaryescape/blah.chat/commit/864908c29f8957c854c28b0e98f7b5771164bd66))
* **cli:** improve components for OpenTUI rewrite ([14f5f03](https://github.com/planetaryescape/blah.chat/commit/14f5f035a0b19e698ad3daf9a0297da401cee688))
* cognitive memory v1 ([21e8bb7](https://github.com/planetaryescape/blah.chat/commit/21e8bb7b4026a5975b02209a8b9d0f1b0eb0be62))
* **cognitive-memory:** access frequency reinforcement ([5f2d737](https://github.com/planetaryescape/blah.chat/commit/5f2d737249eabcd5b490f9fb4bf0aa5f46e23041))
* **cognitive-memory:** add postgres and jsonl adapters ([1d1475a](https://github.com/planetaryescape/blah.chat/commit/1d1475ab1ea2015ca47dc1cd9d3ede53cd3cd2b7))
* complete auth identity cutover ([412d569](https://github.com/planetaryescape/blah.chat/commit/412d569c4593367390d0016f06eb44e84defbb47))
* complete conversation tree crud ([11f5043](https://github.com/planetaryescape/blah.chat/commit/11f504374ef9804950ad27c1b40fca2541edc38f))
* **composio:** curate integrations to 50 high-value services ([2abf0e2](https://github.com/planetaryescape/blah.chat/commit/2abf0e229e8d75a5c5d55e16ebeefef1d963a780))
* **composio:** restore 500+ integrations after OAuth fix ([196ceaa](https://github.com/planetaryescape/blah.chat/commit/196ceaadc8479fa45ec7a56d2f257d45872d5dc3))
* desktop companion controls ([503fe2e](https://github.com/planetaryescape/blah.chat/commit/503fe2e9aea9ad48b9d1f948914470113df77b00))
* desktop remaining review items — offline fallback, cross-platform CI, companion polish, badge API ([21de474](https://github.com/planetaryescape/blah.chat/commit/21de474e7d81d16113e6667b00934b89a1b4a3f4))
* **desktop:** add update check and one-click install flow ([28d0842](https://github.com/planetaryescape/blah.chat/commit/28d0842935d344eaef93e957f3fd3da7cbac113d))
* instrument GenerationV2Service with MetricsCollector ([c5046e5](https://github.com/planetaryescape/blah.chat/commit/c5046e53328822beb835a7d91436f646491b76d9))
* migrate chat attachments ([effa197](https://github.com/planetaryescape/blah.chat/commit/effa1979089b4f6fb4bf19016e4403e977b00b61))
* migrate chat message actions ([1cd4a17](https://github.com/planetaryescape/blah.chat/commit/1cd4a173c1c3b14255713dff75171e8d5bfcdc0a))
* migrate compaction controls ([6d9f0eb](https://github.com/planetaryescape/blah.chat/commit/6d9f0eb7609fa86c0064001fcf41939693c53a11))
* migrate comparison flows ([d7f3ae8](https://github.com/planetaryescape/blah.chat/commit/d7f3ae8458ce0a798181691857da9b9785f0cbf7))
* **mobile:** add Android project scaffolding ([f5b31e5](https://github.com/planetaryescape/blah.chat/commit/f5b31e5e402156df73014d73335f59a7d2405f5f))
* **mobile:** add bookmark and save-as-note actions to messages ([5ddeedd](https://github.com/planetaryescape/blah.chat/commit/5ddeeddcc168f5f37851d03dfd207bdaacd33c9d))
* **mobile:** add branch navigation UI components ([9513d7e](https://github.com/planetaryescape/blah.chat/commit/9513d7eded13c1c904b93660da8fb7676c238423))
* **mobile:** add design system tokens and migrate hardcoded values ([04f0c79](https://github.com/planetaryescape/blah.chat/commit/04f0c7996f7a272e2625a9dfb5131d16d9483a16))
* **mobile:** add drawer navigation with conversation search and project filtering ([748ede0](https://github.com/planetaryescape/blah.chat/commit/748ede0bd3ce3b7e7558502078db04c6fd1a1e79))
* **mobile:** add hooks for bookmarks and notes ([8601c0e](https://github.com/planetaryescape/blah.chat/commit/8601c0eb6e309bd86acf61cc12a317753233410c))
* **mobile:** add hooks for sibling navigation and message actions ([67cd5d9](https://github.com/planetaryescape/blah.chat/commit/67cd5d9c11ea918c8efad69747af0ec14dd4d36f))
* **mobile:** add notes navigation to drawer ([3a90e2b](https://github.com/planetaryescape/blah.chat/commit/3a90e2b81e46bd2e01e70db0cb05ee48fd95d697))
* **mobile:** add notes screens with auto-tag and sharing ([f1b0ba7](https://github.com/planetaryescape/blah.chat/commit/f1b0ba78f1c98e7f517e1698b960465bf17ef377))
* **mobile:** add notes UI components ([abeca6d](https://github.com/planetaryescape/blah.chat/commit/abeca6df76ad12ef28ed2433f9c1f4bba4241071))
* **mobile:** add rich content rendering to chat messages ([437b03b](https://github.com/planetaryescape/blah.chat/commit/437b03b4d4e994a0a3a475a52c313700be7e201e))
* **mobile:** add settings screen with full preference management ([f1cd204](https://github.com/planetaryescape/blah.chat/commit/f1cd204b58163d36d962e239e486e7ff0fb29832))
* **mobile:** add syntax highlighting with react-native-code-highlighter ([15c29c7](https://github.com/planetaryescape/blah.chat/commit/15c29c7e17c860e804662e53488233fd9dd520cd))
* **mobile:** add typed Convex API, ErrorBoundary, and accessibility ([e6c8e6c](https://github.com/planetaryescape/blah.chat/commit/e6c8e6cc01c89300e0d5ee09a3906b4a445123f8))
* **mobile:** filter messages by active branch ([fedc446](https://github.com/planetaryescape/blah.chat/commit/fedc446ccd8cd7466c192ae315b7340c9f0b38e6))
* **mobile:** full-width assistant messages, compact user bubbles ([c3a19b4](https://github.com/planetaryescape/blah.chat/commit/c3a19b4f1c1c76e3d3faf72d389319ed9791a425))
* **mobile:** haptic feedback when streaming starts ([31f458e](https://github.com/planetaryescape/blah.chat/commit/31f458e1c0db20bba173b62966eee5ca1d8748c2))
* **mobile:** increase chat input max expand height to 200px ([da98a45](https://github.com/planetaryescape/blah.chat/commit/da98a4577ff23a138aef445e0f0d8d209a5f815c))
* **mobile:** integrate branch navigation into message components ([916d976](https://github.com/planetaryescape/blah.chat/commit/916d9762c7986fe44ddf520503290329bfa654af))
* **mobile:** production-quality chat with dark theme and proper ordering ([cfe6188](https://github.com/planetaryescape/blah.chat/commit/cfe618854fad590a8df8da65134b96edbfc3daba))
* **mobile:** wire up branch actions in chat screen ([2e53ea3](https://github.com/planetaryescape/blah.chat/commit/2e53ea38af1fdf306cbaf6d4d0694c9a6a13cc77))
* **models:** add CLI for model management ([9904426](https://github.com/planetaryescape/blah.chat/commit/9904426d2e2a08aa6ce47fe7cf44fa707b1487b3))
* **models:** add Kimi K2.5 to static config for UI ([549c9a8](https://github.com/planetaryescape/blah.chat/commit/549c9a88bbce04ae7d12552c9f3be06f4571b8d2))
* **models:** migrate UI from static MODEL_CONFIG to database ([6fff32f](https://github.com/planetaryescape/blah.chat/commit/6fff32fd5df6be20c87028c96587ec8e9d436a7d))
* move chat runtime to postgres ([ecb915e](https://github.com/planetaryescape/blah.chat/commit/ecb915e8e936ab069e016636cc4660c2e694ca89))
* phase 14 blob migration - migrate all Convex blobs to R2 ([5a1a3b3](https://github.com/planetaryescape/blah.chat/commit/5a1a3b3e4518b2e55e74a868edafec31bcbf12c9))
* phase 14 blob migration - migrate all Convex blobs to R2 ([632e99a](https://github.com/planetaryescape/blah.chat/commit/632e99a77b3b81c2bd36b76a3e722f586765015a))
* phase 15 - switch ALL remaining web surfaces from Convex to REST ([3137308](https://github.com/planetaryescape/blah.chat/commit/3137308d00fad960daff57746d7fef4c1010fe07))
* phase 15 - templates, projects, shares, chat components cutover ([aaf5187](https://github.com/planetaryescape/blah.chat/commit/aaf51870e7c35b2ec5c8a568b4f71d27413dccab))
* phase 15 cutover - switch web surfaces from Convex to REST/Postgres ([3ea9f68](https://github.com/planetaryescape/blah.chat/commit/3ea9f68f985e9f1c3cacc9fa8bf619800fceabfc))
* phase 15 phase I - remove Convex from client request path ([ce9f345](https://github.com/planetaryescape/blah.chat/commit/ce9f3454ec235215927974b6b0b2a382c922bbe3))
* phase 15 settings cutover + cleanup-empty route ([87f331a](https://github.com/planetaryescape/blah.chat/commit/87f331af0cb616f9c0ef9860135466a71eda9f26))
* phase 16 dead code removal - purge all Convex from web app ([524f5d6](https://github.com/planetaryescape/blah.chat/commit/524f5d606b464023ca33db727341d452035a0ff5))
* refine starter suggestions with cycling pool and card layout ([b6fae0a](https://github.com/planetaryescape/blah.chat/commit/b6fae0aeeb8e5dd054967b0dcfe26aeca9057675))
* refresh app icons and opengraph assets ([84afc03](https://github.com/planetaryescape/blah.chat/commit/84afc03fb50dbae9529c3948bd1f3d8d688051c9))
* **sdk:** add publish-ready typed SDK ([002152b](https://github.com/planetaryescape/blah.chat/commit/002152ba3a0c276316d11f5327067efc43cb9a37))
* **ui:** add Google service icons for integrations ([9cc4caa](https://github.com/planetaryescape/blah.chat/commit/9cc4caa2edc0434686e2241d63168d49a9227fe0))
* **ui:** add SVG icons for curated integrations ([bb4f74c](https://github.com/planetaryescape/blah.chat/commit/bb4f74c4a36ea1ed7512dc53d86fc8a6aed9c198))
* **web:** add desktop updater manifest endpoint ([7f5fe3c](https://github.com/planetaryescape/blah.chat/commit/7f5fe3ccfe09dac62ed8ee03f854eb5f77b1db6c))
* **web:** add message timestamps and date separators ([3b376b0](https://github.com/planetaryescape/blah.chat/commit/3b376b072e35beb06cf6e596feb316f846208ce6))


### Bug Fixes

* [] add Clerk mock to web test setup and increase test timeouts ([8dbecda](https://github.com/planetaryescape/blah.chat/commit/8dbecda6dfd9cd73e53e57f673cfc3794ee14030))
* [] address CI and review feedback ([c2fdf7c](https://github.com/planetaryescape/blah.chat/commit/c2fdf7ca7b6b0772245ba282acc2e59350ec7396))
* [] address latest cubic review comments ([4860cd8](https://github.com/planetaryescape/blah.chat/commit/4860cd8e2e63e36212a12ed9ad929bc50c4f2d20))
* [] address P2 review comments from cubic ([24fb1c6](https://github.com/planetaryescape/blah.chat/commit/24fb1c67d0dff86c365e245948cecf191ce0053c))
* [] align postgres persistence runtime ([62289d4](https://github.com/planetaryescape/blah.chat/commit/62289d472c087af0798149d388f7cb8f0d3cf0a7))
* [] avoid type-depth in code execution tool ([dc699c0](https://github.com/planetaryescape/blah.chat/commit/dc699c0ba9996ee01bc429fe0e205786326a14b2))
* [] compute percentSaved from MODEL_CONFIG in analyze-model-fit test ([dcb2efc](https://github.com/planetaryescape/blah.chat/commit/dcb2efc48ffa1a164a4e5297622448fb7f1c8672))
* [] disable voice fallback on API errors ([88faca8](https://github.com/planetaryescape/blah.chat/commit/88faca84f46869c2675e1f0a27fbd3b191d62a10))
* [] fall back to Clerk cookies ([f2c4156](https://github.com/planetaryescape/blah.chat/commit/f2c415661fb97af2d242437ed24cf6d3df67f9d4))
* [] fix web test infrastructure and P1 review comments ([d045eb2](https://github.com/planetaryescape/blah.chat/commit/d045eb2c352105b60828c1777e32a51f3a7b57b5))
* [] guard Convex ids in web client ([f008de3](https://github.com/planetaryescape/blah.chat/commit/f008de3ee10383c3babb5176e39fa92f33caa0b9))
* [] harden generation resume and stop ([8b0980c](https://github.com/planetaryescape/blah.chat/commit/8b0980c39035b684183cf315e8bb031d044282c4))
* [] harden Postgres chat routes ([2cee7e1](https://github.com/planetaryescape/blah.chat/commit/2cee7e1b09ea621f216c88a2ee0f7888cfe34089))
* [] increase PGlite test timeout for CI ([159341b](https://github.com/planetaryescape/blah.chat/commit/159341b83d74f5197fcfbe9b3d156c1c3b2dda97))
* [] increase test timeouts for CI across PGlite packages ([ab29534](https://github.com/planetaryescape/blah.chat/commit/ab295349592d67b69b9e83ae74a920500065dd36))
* [] load Postgres with pg in prod ([1f13def](https://github.com/planetaryescape/blah.chat/commit/1f13def90fd1e8a5dd0ece1998fc7f1b3de4871a))
* [] move message metadata to postgres ([a5a88f1](https://github.com/planetaryescape/blah.chat/commit/a5a88f10d0d82ae0b31b5073a6a7dfff72d025df))
* [] point desktop build at existing icon ([516e61f](https://github.com/planetaryescape/blah.chat/commit/516e61f84fa5665dc22ff5c03bbda7b489d49dd0))
* [] reconcile Clerk users by email ([a391e57](https://github.com/planetaryescape/blah.chat/commit/a391e571b95f704d9af87849c5e1a46628304fea))
* [] Resolve Postgres env bootstrap mismatch ([9106ae2](https://github.com/planetaryescape/blah.chat/commit/9106ae2ed2c7268a24d2e0bd8891d690d1e2a923))
* [] seed pending assistant messages ([34fb084](https://github.com/planetaryescape/blah.chat/commit/34fb084d1a52f8245a42961d5f541ec91b99fd0a))
* [] suppress type depth in usePreferences ([13c8d16](https://github.com/planetaryescape/blah.chat/commit/13c8d16b4145d25a5111effacd8eb0091adfa6af))
* add autoRouterEnabled and showSlides to preferences schema ([37e7fbb](https://github.com/planetaryescape/blah.chat/commit/37e7fbb6639e4f1561d464ae1c78000a9e70497d))
* add fetch timeout to trigger utils and forward jobId in embed-file ([bd5ec11](https://github.com/planetaryescape/blah.chat/commit/bd5ec11077672327908f1c0e7ed6e714996f6325))
* add head_sha fallback for dependabot PR lookup ([f47ad3a](https://github.com/planetaryescape/blah.chat/commit/f47ad3a25bc1843ca477fe34d7ba3a7cf0c84880))
* add outbound tool-name diagnostics on generation failures ([3a60fbe](https://github.com/planetaryescape/blah.chat/commit/3a60fbec3b257b87c5f726ae2c7303e3e84f6e91))
* add trailing newlines to iOS asset JSON files ([6ae578f](https://github.com/planetaryescape/blah.chat/commit/6ae578f7a3210e6b1bd67ed1901355f2176a847f))
* address CI failures and PR review comments ([ac17973](https://github.com/planetaryescape/blah.chat/commit/ac17973fdcea28b2eae44fe9bd0db586cc3007f4))
* address code review feedback and CI failures ([bc56b4f](https://github.com/planetaryescape/blah.chat/commit/bc56b4f9acafdd878ba7b3ed94e0275d689261e1))
* address review feedback ([7b5f78c](https://github.com/planetaryescape/blah.chat/commit/7b5f78cb58dc87c263626282148631f5ee1b7aa4))
* address review feedback and CI failures ([8b4f5ec](https://github.com/planetaryescape/blah.chat/commit/8b4f5ecb2b8de5b2319749e5b39f7881aa30d5d2))
* address second round of PR review feedback ([7413a87](https://github.com/planetaryescape/blah.chat/commit/7413a87b9d0b03aa281a28acaaa2b483183f2439))
* **admin:** wrap ScrollArea properly for correct overflow handling ([f4667cb](https://github.com/planetaryescape/blah.chat/commit/f4667cb14b035dae1d6e0f9667cf7d594c5fb153))
* allow manual production deploy dispatch ([#384](https://github.com/planetaryescape/blah.chat/issues/384)) ([7767cd7](https://github.com/planetaryescape/blah.chat/commit/7767cd76b47f0478d4a153e7eaf09108c423a190))
* allow unauthenticated desktop updater endpoint ([7cc96fc](https://github.com/planetaryescape/blah.chat/commit/7cc96fc2edd11626ecf98b3df320906296df3c9c))
* async desktop notarization finalize ([#307](https://github.com/planetaryescape/blah.chat/issues/307)) ([2889a04](https://github.com/planetaryescape/blah.chat/commit/2889a042ce91a5071988e1404b0dff492df2d84f))
* async desktop notarization without wait ([2889a04](https://github.com/planetaryescape/blah.chat/commit/2889a042ce91a5071988e1404b0dff492df2d84f))
* avoid waiting for desktop notarization ([6a8841d](https://github.com/planetaryescape/blah.chat/commit/6a8841d2a8534c85923c15866283e6b2418494ac))
* **backend:** add missing getUserPreferenceState query ([ba4908d](https://github.com/planetaryescape/blah.chat/commit/ba4908dcca7f9864b92abaf1a2b51531628c70a4))
* **backend:** deactivate descendants when editing message ([fd2ee5f](https://github.com/planetaryescape/blah.chat/commit/fd2ee5fb07f5cfd8659182ebb967b60f0c8db664))
* **backend:** gracefully handle AI provider errors in title generation ([557a2cf](https://github.com/planetaryescape/blah.chat/commit/557a2cf79fcd32925f084599b2fb340710e51703))
* **backend:** log usage tracking errors in title generation ([df553fd](https://github.com/planetaryescape/blah.chat/commit/df553fd42384e131ee35b85db44d13a3e9db35b0))
* **backend:** move native deps to optionalDependencies for mobile builds ([e9fad60](https://github.com/planetaryescape/blah.chat/commit/e9fad60c705ff649b4c112c4d18b5418f5d7e13c))
* **backend:** query children by both parentMessageIds and parentMessageId ([e4e92de](https://github.com/planetaryescape/blah.chat/commit/e4e92de1bcb54db8103380da5fe249618c28cbc0))
* build convex deps in production deploy ([b5f3726](https://github.com/planetaryescape/blah.chat/commit/b5f372684d30c892e5bc05c1bb5101078051af99))
* build workspace deps before convex production deploy ([#385](https://github.com/planetaryescape/blah.chat/issues/385)) ([b5f3726](https://github.com/planetaryescape/blah.chat/commit/b5f372684d30c892e5bc05c1bb5101078051af99))
* **ci:** add checkout step to dependabot auto-merge workflow ([5028263](https://github.com/planetaryescape/blah.chat/commit/5028263b9a2e40c46e230d89c66bcfafa082f9a7))
* **ci:** build app+dmg for desktop updater artifacts ([69f7924](https://github.com/planetaryescape/blah.chat/commit/69f7924183581af94f0c417fc4c2da84a51c6603))
* **ci:** fallback portable check when rg missing ([de77b42](https://github.com/planetaryescape/blah.chat/commit/de77b427ab1d440253b7bd5b04ada88e30b3666a))
* **ci:** handle shallow sdk version check ([998441c](https://github.com/planetaryescape/blah.chat/commit/998441c2931e35f2f60724a97e550eee1306df8e))
* **ci:** repair desktop notarization parsing scripts ([aa58459](https://github.com/planetaryescape/blah.chat/commit/aa58459fa60fff1cf643dd02fd506ed06013c321))
* **ci:** restore valid desktop release workflow yaml ([6f6ca79](https://github.com/planetaryescape/blah.chat/commit/6f6ca79dc682765b8ef7db08c9c1f2b7afcbda9d))
* **ci:** restore valid incognito stale query ([d84d021](https://github.com/planetaryescape/blah.chat/commit/d84d0212b191209d89728526249b43fe00da0468))
* **ci:** stabilize failing PR checks ([cc2412f](https://github.com/planetaryescape/blah.chat/commit/cc2412f40e66e4d8c3be060b60a0e392ca3e70b6))
* **ci:** stop actions approving PRs ([947f6fd](https://github.com/planetaryescape/blah.chat/commit/947f6fdf7de012b684b3497d99367394b34cd910))
* **ci:** sync lockfile and unblock checks ([36b09f0](https://github.com/planetaryescape/blah.chat/commit/36b09f0b941aa0380ae9a359c93704f95593e3e6))
* **ci:** use draft-then-publish for immutable releases ([8056fc7](https://github.com/planetaryescape/blah.chat/commit/8056fc773a4ec30aa5b02b85ed072e397cf4727f))
* **ci:** use macos-13 for darwin-x64 CLI builds ([#276](https://github.com/planetaryescape/blah.chat/issues/276)) ([801280d](https://github.com/planetaryescape/blah.chat/commit/801280d63addc175130d3637e3e059024e2da087))
* **ci:** use macos-15-large for darwin-x64 (macos-13 retired) ([cf707a0](https://github.com/planetaryescape/blah.chat/commit/cf707a0a9bbe7f46bb644f7e262383c46977b5b5))
* **ci:** use macos-15-large for darwin-x64 CLI builds ([382be1b](https://github.com/planetaryescape/blah.chat/commit/382be1b224d538482c3cd5161e3f2dc28432e2d4))
* **ci:** use MERGE_BOT_TOKEN for automerge approvals ([082f5cd](https://github.com/planetaryescape/blah.chat/commit/082f5cd7aafce156aa328a36f5733404201e4896))
* **ci:** use tab delimiter when parsing gh release list ([f3de5bc](https://github.com/planetaryescape/blah.chat/commit/f3de5bcc41fb8465197bcbe28cdc091db2f28b90))
* **cli:** address PR review issues ([6651ee7](https://github.com/planetaryescape/blah.chat/commit/6651ee7afe5ed735cd7d2129f87083bea0cb2566))
* **cli:** await async actions and add --api-key login option ([4f67ad9](https://github.com/planetaryescape/blah.chat/commit/4f67ad94fc952171a0841bea552a28683b0421d6))
* **cli:** bind chat input value so it clears after send ([7a0314c](https://github.com/planetaryescape/blah.chat/commit/7a0314c3ec3c5559b08e3143c6fd5c1397d0ee79))
* **cli:** install cross-platform opentui binaries before compile ([917e656](https://github.com/planetaryescape/blah.chat/commit/917e65656379b92bfac1e6cb4b8cb638613d368e))
* **cli:** resolve parser.worker.js from package root ([9882e32](https://github.com/planetaryescape/blah.chat/commit/9882e3231d94bbaa64640590e1754a2a3f45a240))
* **cli:** resolve TreeSitter worker path in compiled binary ([247c92c](https://github.com/planetaryescape/blah.chat/commit/247c92cc03b68b9d9b55c82ccc3f5e5b5a8aa429))
* **cli:** split scoped package name in postinstall path join ([a84c231](https://github.com/planetaryescape/blah.chat/commit/a84c231256576ccde60969967e79205a85dc2f89))
* **cli:** split scoped package name into path segments for join() ([b81c5d6](https://github.com/planetaryescape/blah.chat/commit/b81c5d69ffdb37928f386937c42c273114b28450))
* **cli:** use Bun.build with solid plugin for JSX transform ([5d4de40](https://github.com/planetaryescape/blah.chat/commit/5d4de402e563233aecf62a95a57c812b08927cef))
* **cli:** use cli-v tag format and remove darwin-x64 ([68dd7ad](https://github.com/planetaryescape/blah.chat/commit/68dd7ad762a3bbb252ea3449872a3fa675edacd6))
* **cli:** use native runners for cross-platform builds ([45148d5](https://github.com/planetaryescape/blah.chat/commit/45148d5302307ae0d5c6a5396603d969b80ed1a5))
* **cli:** use PowerShell Compress-Archive on Windows ([e086fb1](https://github.com/planetaryescape/blah.chat/commit/e086fb18e1d3ca4b39c48aa11cc6a140368fa787))
* **cognitive-memory:** jsonl rollover preserves history ([2d7a34b](https://github.com/planetaryescape/blah.chat/commit/2d7a34b5a97955720cbb6e3f8a3e214a5bcae87d))
* **cognitive-memory:** postgres linked memories bidirectional ([220005d](https://github.com/planetaryescape/blah.chat/commit/220005d43e35b889ce49990953ac918c91c7bd51))
* commit lockfile and package.json changes for trigger.dev deps ([f0af5ed](https://github.com/planetaryescape/blah.chat/commit/f0af5ed2dadaaf11314cd764071f10659f46f95d))
* **composio:** include CSRF state in OAuth callback URL ([acfde25](https://github.com/planetaryescape/blah.chat/commit/acfde253e34dd1acae93d827d08abbe3cc64feef))
* **composio:** preserve active status during re-auth to prevent tool access loss ([5bc0943](https://github.com/planetaryescape/blah.chat/commit/5bc0943244ce323bb55fe3a83545739ca03d46e7))
* **composio:** prioritize connectedAccountId param, add verification note ([de7060a](https://github.com/planetaryescape/blah.chat/commit/de7060a562a665277b8b35a546506123a4ed6098))
* **composio:** reduce to 10 OAuth integrations for reliability ([dee657b](https://github.com/planetaryescape/blah.chat/commit/dee657b1dd8663acdf7e22812e2885964f72fdf5))
* configure EAS to use bun install ([91b4abf](https://github.com/planetaryescape/blah.chat/commit/91b4abf447b8122f5e0a885ecc7ecf545a2132a2))
* dependabot auto-merge workflow chain ([c9d45ad](https://github.com/planetaryescape/blah.chat/commit/c9d45adc6121fe3aae1a297fc2a0c01b0f82d17c))
* desktop app security, UX, and code quality overhaul ([12a9c46](https://github.com/planetaryescape/blah.chat/commit/12a9c4655ad8cb01497282cbd126d54a7398f283))
* detect dependabot PR number from workflow_run payload ([4f2dc10](https://github.com/planetaryescape/blah.chat/commit/4f2dc1035b052ffe1be1f11ffdea403f2904f3f0))
* enforce tool name limits at generation preflight ([59a311c](https://github.com/planetaryescape/blah.chat/commit/59a311c61325481f6c3cb53550dd8f84113a7d87))
* expose desktop updater route as public ([#387](https://github.com/planetaryescape/blah.chat/issues/387)) ([7cc96fc](https://github.com/planetaryescape/blah.chat/commit/7cc96fc2edd11626ecf98b3df320906296df3c9c))
* fix dependabot auto-merge pipeline ([21cde5f](https://github.com/planetaryescape/blah.chat/commit/21cde5f869a8405e5e4451aebd8033dbb0b5689b))
* harden desktop release checks and docs ([c3370ea](https://github.com/planetaryescape/blah.chat/commit/c3370eab3a770ff9ee9b4a9360894d69bc2b3bf0))
* harden tool name collision handling ([edc26a7](https://github.com/planetaryescape/blah.chat/commit/edc26a7caa929c12cc511354aad363be75c11938))
* harden touch chat input focus stability ([5291ac0](https://github.com/planetaryescape/blah.chat/commit/5291ac08abd9464c6cf9fe9a430e10c3969a8831))
* improve internal tool priority when Composio active ([57911e0](https://github.com/planetaryescape/blah.chat/commit/57911e06ec552525614c85f5fc10378440f20ad5))
* **install:** use INSTALL_DIR for PATH instead of hardcoded path ([fd2497a](https://github.com/planetaryescape/blah.chat/commit/fd2497afb1a93a7e8c327cce8720936b64f79bd4))
* keep temporal prefixes in prompt history only ([#402](https://github.com/planetaryescape/blah.chat/issues/402)) ([d804f2e](https://github.com/planetaryescape/blah.chat/commit/d804f2eba050a99771f51791530e6141c64e5878))
* make chat timeline tree-aware and deterministic ([0468503](https://github.com/planetaryescape/blah.chat/commit/046850323d729f790574707bf1f1a581eedd6232))
* mobile new chat access ([98f0012](https://github.com/planetaryescape/blah.chat/commit/98f0012af9489acefc9c37a8fbb7315459553e4d))
* **mobile,web:** new chat button + sidebar auto-close + SSR header visibility ([6a3cd92](https://github.com/planetaryescape/blah.chat/commit/6a3cd92176686dbb363df569ab9a548727c1bbaa))
* **mobile:** add diagnostic overlay for TestFlight connection failure ([208f1f4](https://github.com/planetaryescape/blah.chat/commit/208f1f4af085d217631bd5b9a4311fe9697c6e84))
* **mobile:** add eas-build-pre-install hook for bun detection ([44598b1](https://github.com/planetaryescape/blah.chat/commit/44598b1774ff98e9ec8a1d52b52f7708a6a7a83f))
* **mobile:** add eas-build-pre-install to mobile package.json ([f3fd53c](https://github.com/planetaryescape/blah.chat/commit/f3fd53c94b15e56acbacaba9eb61e38e9341bd87))
* **mobile:** add empty bun.lockb for EAS package manager detection ([e3b3187](https://github.com/planetaryescape/blah.chat/commit/e3b318735005b440accf35f3f23a8c3e7510fc94))
* **mobile:** add external browser fallback for Mermaid diagrams ([5e1ee8a](https://github.com/planetaryescape/blah.chat/commit/5e1ee8a5a198d9327177ba7448515114bba21e05))
* **mobile:** address security issues from code review ([de7933e](https://github.com/planetaryescape/blah.chat/commit/de7933e3d00094730a59decaeee978b50ec2dc7e))
* **mobile:** audit phase A/B — parser fix, design system, typed API ([2a63d6b](https://github.com/planetaryescape/blah.chat/commit/2a63d6b0d49cacdda14a68970c492108e3a32d4d))
* **mobile:** balance user bubble padding (16h x 8v) ([72915eb](https://github.com/planetaryescape/blah.chat/commit/72915eb39cc7297d41462f45fcf3b1f76abe4b5d))
* **mobile:** check typeof for optimistic ID detection ([6bdbdaf](https://github.com/planetaryescape/blah.chat/commit/6bdbdafa0bc41348bc403fdbb7ac4d7d99fb8cfd))
* **mobile:** delete lockfile in pre-install to bypass frozen-lockfile ([b10f696](https://github.com/planetaryescape/blah.chat/commit/b10f696c9a21822b74906ac2fe21ca3d09ac41aa))
* **mobile:** fix refractor crash by shimming it out in Metro ([b55825b](https://github.com/planetaryescape/blah.chat/commit/b55825bebfa69d8e21d3892421c34fa20f3d3d55))
* **mobile:** handle email verification step during sign-in ([a30ccf4](https://github.com/planetaryescape/blah.chat/commit/a30ccf46791bd41c3c33835a2ef1c7f2d0d8b27a))
* **mobile:** handle Mermaid CDN failure gracefully ([8abce84](https://github.com/planetaryescape/blah.chat/commit/8abce84840eb593395626cd8e6665c1ba0f640db))
* **mobile:** improve LaTeX detection and fallback rendering ([0b79d8e](https://github.com/planetaryescape/blah.chat/commit/0b79d8e9f7c80cbbb9ac5cbcfa247808f65c8617))
* **mobile:** improve WebView detection and LaTeX fallback ([31ab479](https://github.com/planetaryescape/blah.chat/commit/31ab4794625d9a1448778b8e954d3558bdd9e9d6))
* **mobile:** include bun.lock in EAS builds for package manager detection ([1954360](https://github.com/planetaryescape/blah.chat/commit/1954360690aece8380a2049d12311c6be59bca4a))
* **mobile:** increase chat text weight to medium ([639f98f](https://github.com/planetaryescape/blah.chat/commit/639f98fdeb75cdcfbffcfe3b6b51dce79a14cf22))
* **mobile:** increase dedup window to 30s for slow networks ([3f64e81](https://github.com/planetaryescape/blah.chat/commit/3f64e81ec8be3dec068acacebc5bed2c92522fdb))
* **mobile:** keep bun lockfile for EAS ([ed55fcd](https://github.com/planetaryescape/blah.chat/commit/ed55fcdd7e8a54a9907115bcced295f44f4afcc1))
* **mobile:** make Bible verse links inline with Text onPress ([6be6087](https://github.com/planetaryescape/blah.chat/commit/6be6087c2fa3d55714fbbb66b1ede51184bdf1f4))
* **mobile:** match Bible verse link color to web primary ([68535e5](https://github.com/planetaryescape/blah.chat/commit/68535e564e9eddde7b5fee3fe6b64aee54965b71))
* **mobile:** pin react to 19.1.0 to match react-native 0.81.5 ([d553f55](https://github.com/planetaryescape/blah.chat/commit/d553f5517198f6c97fef6e747ca14bfee5babe1b))
* **mobile:** polyfill navigator.onLine for Clerk init + restore resourceCache ([eebde4d](https://github.com/planetaryescape/blah.chat/commit/eebde4dbf1776f4376c378b7dcba904def1c451a))
* **mobile:** redesign auth screens + fix sign-in not working ([9005ae7](https://github.com/planetaryescape/blah.chat/commit/9005ae75aff2f167c9eb689a1f2e3d2d9743e028))
* **mobile:** regenerate bun.lock for EAS frozen lockfile ([8047960](https://github.com/planetaryescape/blah.chat/commit/80479609f0c6b218fd4697953a382b7a65b0d4d5))
* **mobile:** remove _generated imports to pass portable check ([b81cb1e](https://github.com/planetaryescape/blah.chat/commit/b81cb1e24e494320e6187eadd9a0385b8e25c9b0))
* **mobile:** remove console.error in favor of graceful handling ([ab4ef47](https://github.com/planetaryescape/blah.chat/commit/ab4ef477696db0c15d3c6633e10121faa31ebf80))
* **mobile:** remove dead (app) route group and fix auth redirect ([05d7868](https://github.com/planetaryescape/blah.chat/commit/05d7868f1e8481e8b440f36e44368e705181bc3d))
* **mobile:** remove unused variables in mathProcessor ([a4f92e5](https://github.com/planetaryescape/blah.chat/commit/a4f92e5c1d8a87d46835c9e08bc590e9acd67b2a))
* **mobile:** replace broken syntax highlighter with native code display ([bc1ea5e](https://github.com/planetaryescape/blah.chat/commit/bc1ea5edbc16b4dc6a82b6ae68dfcef5201e0564))
* **mobile:** resolve bugs in chat rendering and animations ([b8f0fe5](https://github.com/planetaryescape/blah.chat/commit/b8f0fe5deb23b8dc390ccdb968317534f96f6fe2))
* **mobile:** resolve Clerk isLoaded hang on TestFlight ([30c6d28](https://github.com/planetaryescape/blah.chat/commit/30c6d28089bce259246cd2d306069d8b181be5d2))
* **mobile:** resolve TestFlight login connection failure ([#348](https://github.com/planetaryescape/blah.chat/issues/348)) ([9d5290a](https://github.com/planetaryescape/blah.chat/commit/9d5290ac07e4aa44f1b2b0eaf45ea14672899d39))
* **mobile:** revert typed Convex API to fix React version mismatch ([02da6ca](https://github.com/planetaryescape/blah.chat/commit/02da6ca02ac4baa3886107eb0db5bc0105407dc8))
* **mobile:** safely handle WebView native module in Expo Go ([2db784d](https://github.com/planetaryescape/blah.chat/commit/2db784da30a301795626b1c422da8db71b13de12))
* **mobile:** save as note sheet not opening ([8315588](https://github.com/planetaryescape/blah.chat/commit/83155887010d7b8bd450ddb79613749c2829d0bf))
* **mobile:** sync bun version to 1.3.5 across all configs ([2c55cd1](https://github.com/planetaryescape/blah.chat/commit/2c55cd1165a9bf1f9c559f3f60a898a5285db19a))
* **mobile:** transpile bible-passage-reference-parser private class fields ([c85efc3](https://github.com/planetaryescape/blah.chat/commit/c85efc397b1597efe4cd41b255b7ec2b7831bc5e))
* **mobile:** use glass-style user bubble matching web ([f6c47e4](https://github.com/planetaryescape/blah.chat/commit/f6c47e46c135c92c7bf516e27908200ba2cd2f4c))
* **mobile:** use inline hljs style for syntax highlighter ([f484f5d](https://github.com/planetaryescape/blah.chat/commit/f484f5d61121187a03274bd331bc41affbd617c3))
* **mobile:** use primary color for all links in markdown ([31a8413](https://github.com/planetaryescape/blah.chat/commit/31a8413184f8399fa67e127dd7b4ef2b15dbc0d7))
* **mobile:** use require() for bible-passage-reference-parser ([c746f34](https://github.com/planetaryescape/blah.chat/commit/c746f34818c96dc0e953edbdf3b49c72262d40cb))
* **mobile:** use RNGH TouchableOpacity for drawer gesture compatibility ([1e028e8](https://github.com/planetaryescape/blah.chat/commit/1e028e8aaa651ebc933778563d408650dede7ce1))
* **models:** run convex CLI from backend directory ([4385e10](https://github.com/planetaryescape/blah.chat/commit/4385e10df1aeb889fd5ec629c9392d33d040936e))
* normalize tool names to satisfy provider limits ([867257e](https://github.com/planetaryescape/blah.chat/commit/867257e644563b51ffd8ae0d1994d37f48420900))
* preserve mobile chat input caret focus ([7b76569](https://github.com/planetaryescape/blah.chat/commit/7b76569e287ea4d45e88fa526f99436e2c84f9b2))
* prevent stale autorelease pending labels ([180583b](https://github.com/planetaryescape/blah.chat/commit/180583b6b087d21bd15b4726b88ad05de5df94de))
* publish desktop releases with DMG (immutable releases) ([#304](https://github.com/planetaryescape/blah.chat/issues/304)) ([85a3a6c](https://github.com/planetaryescape/blah.chat/commit/85a3a6c5d990d755d9442197110fbe89c473ebe3))
* quote run cmd with colon ([e962077](https://github.com/planetaryescape/blah.chat/commit/e962077842bfd4089675dd2ed64eee2b511a19cd))
* raycast ci filter ([2376e8c](https://github.com/planetaryescape/blah.chat/commit/2376e8cb9061faa118cdded97e1a82982d0cf1ce))
* raycast ci install ([0ee90a9](https://github.com/planetaryescape/blah.chat/commit/0ee90a979f8a924377f4c36e64c7ae08f3779471))
* **raycast:** relax lint for bun-only workspace ([1f50881](https://github.com/planetaryescape/blah.chat/commit/1f5088133d507159514cc83fbb67f98e570b9d05))
* remove invalid install config from eas.json ([16a21e2](https://github.com/planetaryescape/blah.chat/commit/16a21e2cb04ef03888721d97ce1346a8d7c6d78c))
* remove unused Buffer import and mapping ([af0c0de](https://github.com/planetaryescape/blah.chat/commit/af0c0def19d5bc83cb06390f2dcd3122b3cf5edc))
* repair dependabot auto-merge trigger ([720dbd6](https://github.com/planetaryescape/blah.chat/commit/720dbd64919315904778f7be847d79cb0205e6e0))
* repair dependabot merge automation ([b1e1ee6](https://github.com/planetaryescape/blah.chat/commit/b1e1ee6542c9e509a49baa5be5c82403fafee812))
* require Developer ID cert for desktop release ([08877a8](https://github.com/planetaryescape/blah.chat/commit/08877a81c8adc1e892c4177978a0372174502b95))
* resolve codacy issues in message tree ordering ([914dc82](https://github.com/planetaryescape/blah.chat/commit/914dc8287a3d30186b6765c0d1e6d746c7242599))
* **security:** address critical OAuth vulnerabilities ([a7d6485](https://github.com/planetaryescape/blah.chat/commit/a7d648540f6493c2632fd481fc422ba079c061d5))
* **security:** hardcode production domain for postMessage origin ([0c32693](https://github.com/planetaryescape/blah.chat/commit/0c326930414dff497bc81eed2f71902c6f43ee2c))
* **security:** strengthen CSRF and XSS protections ([f726e26](https://github.com/planetaryescape/blah.chat/commit/f726e26a7856685fcddd23700ceb19b8556d6e99))
* skip desktop build on non-mac CI hosts ([60fe91e](https://github.com/planetaryescape/blah.chat/commit/60fe91e009ce38e39717c0ac0cfab2d89f6800a7))
* stabilize auto-route candidate score test ([b30fe12](https://github.com/planetaryescape/blah.chat/commit/b30fe122f82436cd140cffc53b83afc252518f5f))
* stabilize desktop build and updater defaults ([00f91cf](https://github.com/planetaryescape/blah.chat/commit/00f91cf01701a6a78ebbed1daf65f3b0aff2c097))
* stabilize iOS mobile chat input focus ([4e920ab](https://github.com/planetaryescape/blah.chat/commit/4e920ab9a5565a0c4b4d7fe73a5818b1e5c7f2dd))
* sync byod schema and make classifier fields migration-safe ([016c066](https://github.com/planetaryescape/blah.chat/commit/016c066deb9fb308cb705d6292f3a374a2a2f1fd))
* **test:** add missing get/put mocks to userPreferences cache ([7cbea3f](https://github.com/planetaryescape/blah.chat/commit/7cbea3ff1bbab9c79948d64e8ef98bb15b4b8eae))
* **test:** mock useSidebar in ConversationItem tests ([8473ae0](https://github.com/planetaryescape/blah.chat/commit/8473ae0399809bd6b9d1ce544c1a08a06bdaaddc))
* trigger desktop release on tag push instead of release event ([c5a946e](https://github.com/planetaryescape/blah.chat/commit/c5a946ee15a1c026d6b4d424b6c20b6837099bd8))
* unblock CI convex dry run + sdk build ([db0fc2a](https://github.com/planetaryescape/blah.chat/commit/db0fc2ad2cf648f16c447940668d820198341636))
* use backend deploy script for production convex deploy ([#386](https://github.com/planetaryescape/blah.chat/issues/386)) ([f904d61](https://github.com/planetaryescape/blah.chat/commit/f904d6103e17a9775607e62fc77663f267d212f8))
* use backend deploy script in production workflow ([f904d61](https://github.com/planetaryescape/blah.chat/commit/f904d6103e17a9775607e62fc77663f267d212f8))
* use legacy bible parser bundle in mobile build ([39a5acd](https://github.com/planetaryescape/blah.chat/commit/39a5acdffdce07439babdbdf38b8a1cc978b421d))
* use PR author instead of actor for dependabot checks ([46357a2](https://github.com/planetaryescape/blah.chat/commit/46357a2ebc8382c62cbfd7120c1a013eb3314167))
* validate fallback model and sync pre-created message model ([3692f65](https://github.com/planetaryescape/blah.chat/commit/3692f65e4b590118d993b2cf403fd814df0b542e))
* verify notarized dmg with open assessment ([3566c81](https://github.com/planetaryescape/blah.chat/commit/3566c811b8acfe9a9f804505efb8beb24824171c))
* verify notarized dmg with proper spctl mode ([#381](https://github.com/planetaryescape/blah.chat/issues/381)) ([3566c81](https://github.com/planetaryescape/blah.chat/commit/3566c811b8acfe9a9f804505efb8beb24824171c))
* **web:** defer mermaid rendering until streaming completes ([19faeb9](https://github.com/planetaryescape/blah.chat/commit/19faeb9dabb325e6e49490ec217563412b4c0afd))
* **web:** escape &gt; characters in JSX DialogDescription ([fee5383](https://github.com/planetaryescape/blah.chat/commit/fee5383da3fe9b9fcb37ff671e42eff4a4577c8b))
* **web:** increase assistant message font weight to medium ([84b780c](https://github.com/planetaryescape/blah.chat/commit/84b780cb9ce98adc26cf8210011b5c658715139e))
* **web:** synthesize desktop updater manifest from release artifacts ([c4f5d15](https://github.com/planetaryescape/blah.chat/commit/c4f5d1530fc835b94349d574cd1c529702332dbb))
* wrap streamText in try/catch, reset haptic ref on conversation change ([44e8321](https://github.com/planetaryescape/blah.chat/commit/44e8321e074bae932395cc2821fb21620217434d))


### Performance Improvements

* **mobile:** optimize chat rendering and message deduplication ([520b99b](https://github.com/planetaryescape/blah.chat/commit/520b99b13aa0f9230de58777661758017d010001))

## [1.35.2](https://github.com/planetaryescape/blah.chat/compare/v1.35.1...v1.35.2) (2026-03-30)


### Bug Fixes

* [] address CI and review feedback ([c2fdf7c](https://github.com/planetaryescape/blah.chat/commit/c2fdf7ca7b6b0772245ba282acc2e59350ec7396))
* [] disable voice fallback on API errors ([88faca8](https://github.com/planetaryescape/blah.chat/commit/88faca84f46869c2675e1f0a27fbd3b191d62a10))
* [] fall back to Clerk cookies ([f2c4156](https://github.com/planetaryescape/blah.chat/commit/f2c415661fb97af2d242437ed24cf6d3df67f9d4))
* [] harden Postgres chat routes ([2cee7e1](https://github.com/planetaryescape/blah.chat/commit/2cee7e1b09ea621f216c88a2ee0f7888cfe34089))
* [] load Postgres with pg in prod ([1f13def](https://github.com/planetaryescape/blah.chat/commit/1f13def90fd1e8a5dd0ece1998fc7f1b3de4871a))
* [] reconcile Clerk users by email ([a391e57](https://github.com/planetaryescape/blah.chat/commit/a391e571b95f704d9af87849c5e1a46628304fea))
* [] seed pending assistant messages ([34fb084](https://github.com/planetaryescape/blah.chat/commit/34fb084d1a52f8245a42961d5f541ec91b99fd0a))
* repair dependabot auto-merge trigger ([720dbd6](https://github.com/planetaryescape/blah.chat/commit/720dbd64919315904778f7be847d79cb0205e6e0))

## [1.35.1](https://github.com/planetaryescape/blah.chat/compare/v1.35.0...v1.35.1) (2026-03-29)


### Bug Fixes

* [] Resolve Postgres env bootstrap mismatch ([9106ae2](https://github.com/planetaryescape/blah.chat/commit/9106ae2ed2c7268a24d2e0bd8891d690d1e2a923))
* address review feedback ([7b5f78c](https://github.com/planetaryescape/blah.chat/commit/7b5f78cb58dc87c263626282148631f5ee1b7aa4))

## [1.35.0](https://github.com/planetaryescape/blah.chat/compare/v1.34.0...v1.35.0) (2026-03-29)


### Features

* [] add AES-256-GCM encryption for BYOD connection strings ([5ddd5cb](https://github.com/planetaryescape/blah.chat/commit/5ddd5cbaf13733063d4bcc3205401d15176022f2))
* [] add backfill-embeddings trigger tasks ([8706e6b](https://github.com/planetaryescape/blah.chat/commit/8706e6b28895b502a7702601939d449adca0405e))
* [] add BYOD health check and migration runner scheduled tasks ([9353d43](https://github.com/planetaryescape/blah.chat/commit/9353d43cfe155299c8e39548697f60d2258d13ed))
* [] add BYOD Neon connection validation, migration runner, and resolver ([3af38e5](https://github.com/planetaryescape/blah.chat/commit/3af38e5e010aee68954a942b9bfdcd66bd6823b0))
* [] add BYOD Neon persistence layer and REST API routes ([0e2d6e9](https://github.com/planetaryescape/blah.chat/commit/0e2d6e9612b31fabd142152bdc54b8d0a7ada338))
* [] add BYOD Neon schema tables and migration ([76ddd42](https://github.com/planetaryescape/blah.chat/commit/76ddd42c90638692839da263d8c464e52b2b24e2))
* [] add BYOD Neon settings UI, config hook, and connection blocker ([40200b0](https://github.com/planetaryescape/blah.chat/commit/40200b047a0f5d67df14a577b068144f240b9be2))
* [] add cleanup and monitoring scheduled tasks ([63913a2](https://github.com/planetaryescape/blah.chat/commit/63913a2a2fbebcb0cb2b50565d3ca041d6db3e58))
* [] add comparison feedback, regeneration tracking, and token fields to repository ([65b8b01](https://github.com/planetaryescape/blah.chat/commit/65b8b018a24459f349c875a24736c98375c1edd0))
* [] add comparison group state API ([72359a3](https://github.com/planetaryescape/blah.chat/commit/72359a3006fb8888c3b083db0e7954cb04a2617a))
* [] add Convex-to-Postgres migration tooling ([c20c0ea](https://github.com/planetaryescape/blah.chat/commit/c20c0ea6a47cb22553e48721e0507f4abceaa290))
* [] add data integrity scheduled tasks ([a623156](https://github.com/planetaryescape/blah.chat/commit/a623156773203fd2f16a858787e0f55e2b6fc189))
* [] add embed-message, embed-note, embed-task trigger jobs ([dd38b7d](https://github.com/planetaryescape/blah.chat/commit/dd38b7d7e9864179f7835b832e9eae01225010b4))
* [] add epsilon-greedy exploration policy ([1f78403](https://github.com/planetaryescape/blah.chat/commit/1f78403cbef0c3dfd435320b24624036817bc094))
* [] add knowledge search and feedback surface ([1520b9f](https://github.com/planetaryescape/blah.chat/commit/1520b9f50b63b3cc59decf2c4bd5ca047071fbf7))
* [] add memory and extraction scheduled tasks ([e7ea42b](https://github.com/planetaryescape/blah.chat/commit/e7ea42b29662acf68cc0852326ffe89bbe7a6085))
* [] add pgvector type, search utils, and FTS migration ([14e6e9c](https://github.com/planetaryescape/blah.chat/commit/14e6e9ca95df9cfe9772dc54691fa577b13fe4b2))
* [] add policy engine types and default weights ([58d87d4](https://github.com/planetaryescape/blah.chat/commit/58d87d41d36ddaad58a6ced7a54e636a447dcde4))
* [] add provider health cron job ([95d9e60](https://github.com/planetaryescape/blah.chat/commit/95d9e606726c37eb211f771440e82e3c4c28eea2))
* [] add shadow evaluator and widen policy engine feedback signals ([138e26e](https://github.com/planetaryescape/blah.chat/commit/138e26ef4a672b8ce5c84111af3fd7dfdc037189))
* [] add Slack alerting, k6 load tests, and mark all phases complete ([97f2cd7](https://github.com/planetaryescape/blah.chat/commit/97f2cd7bc90e7a0cf71a0d4a522011af4b9527ae))
* [] add trigger jobs and transport client ([974cbf4](https://github.com/planetaryescape/blah.chat/commit/974cbf4ccadf2353f0e3bf869ec078f316ca72b4))
* [] add usage tracking to generation provider ([cfc14e0](https://github.com/planetaryescape/blah.chat/commit/cfc14e0d3491995164f2a223463217b9c865aefd))
* [] cut cli chat to generation-v2 ([d2e8af3](https://github.com/planetaryescape/blah.chat/commit/d2e8af36daafcb5d10c7ab261011cb8c9f44465d))
* [] export all 24 task types from jobs package index ([abd51cb](https://github.com/planetaryescape/blah.chat/commit/abd51cb056bdab988d308ea00c18773c9c3e19ec))
* [] export policy engine and exploration from auto-router ([9129b63](https://github.com/planetaryescape/blah.chat/commit/9129b63ea0f0a6435b83a52a083d41e8f9617203))
* [] extract policy engine scoring and data helpers ([e04552e](https://github.com/planetaryescape/blah.chat/commit/e04552ebe22bb7753080ed10f44aae703f199fbe))
* [] finish comparison mode UI ([45e9c1a](https://github.com/planetaryescape/blah.chat/commit/45e9c1aad5ce6f1983789cf532ad4620c354d0e4))
* [] migrate chat and conversation surface ([3f8ea0a](https://github.com/planetaryescape/blah.chat/commit/3f8ea0a87db27f929a7c1f6be27f9067d9b17223))
* [] migrate notes and tasks workspace ([4a89691](https://github.com/planetaryescape/blah.chat/commit/4a896915c511b5b8af3bb6cc0243c1d39f18ad3e))
* [] migrate project notes and tasks ([eae51e6](https://github.com/planetaryescape/blah.chat/commit/eae51e676e9accd76dae722051adfe4ef7fdf123))
* [] move blob flows to r2 and postgres ([eeba2c1](https://github.com/planetaryescape/blah.chat/commit/eeba2c172b4ddc8c298cdda6ff3d8ed222ce0bb5))
* [] refresh GPT and OpenRouter models ([59c554f](https://github.com/planetaryescape/blah.chat/commit/59c554f6cb22dc49f3f67caa88a65c9787ea224a))
* [] wire embedding generation into creation paths ([bc587a7](https://github.com/planetaryescape/blah.chat/commit/bc587a7f5ad02104f00e81407e5c5d0fb35125d9))
* [] wire regeneration signal into routing feedback ([c42f564](https://github.com/planetaryescape/blah.chat/commit/c42f56461778bf69793358e56354ce41d32ac4dd))
* add check-metrics-thresholds scheduled job ([aeb7682](https://github.com/planetaryescape/blah.chat/commit/aeb7682e2c643f54ab6e6156236c620f4009e04e))
* add MetricsCollector observability module ([ff888a3](https://github.com/planetaryescape/blah.chat/commit/ff888a3ad9233c245280d53f6785d50b81794091))
* **chat:** add per-chat integration scope ([e0f0561](https://github.com/planetaryescape/blah.chat/commit/e0f056123509bdd7ab59863cf43d3e2636fddbc4))
* complete auth identity cutover ([412d569](https://github.com/planetaryescape/blah.chat/commit/412d569c4593367390d0016f06eb44e84defbb47))
* complete conversation tree crud ([11f5043](https://github.com/planetaryescape/blah.chat/commit/11f504374ef9804950ad27c1b40fca2541edc38f))
* instrument GenerationV2Service with MetricsCollector ([c5046e5](https://github.com/planetaryescape/blah.chat/commit/c5046e53328822beb835a7d91436f646491b76d9))
* migrate chat attachments ([effa197](https://github.com/planetaryescape/blah.chat/commit/effa1979089b4f6fb4bf19016e4403e977b00b61))
* migrate chat message actions ([1cd4a17](https://github.com/planetaryescape/blah.chat/commit/1cd4a173c1c3b14255713dff75171e8d5bfcdc0a))
* migrate compaction controls ([6d9f0eb](https://github.com/planetaryescape/blah.chat/commit/6d9f0eb7609fa86c0064001fcf41939693c53a11))
* migrate comparison flows ([d7f3ae8](https://github.com/planetaryescape/blah.chat/commit/d7f3ae8458ce0a798181691857da9b9785f0cbf7))
* move chat runtime to postgres ([ecb915e](https://github.com/planetaryescape/blah.chat/commit/ecb915e8e936ab069e016636cc4660c2e694ca89))
* phase 14 blob migration - migrate all Convex blobs to R2 ([5a1a3b3](https://github.com/planetaryescape/blah.chat/commit/5a1a3b3e4518b2e55e74a868edafec31bcbf12c9))
* phase 14 blob migration - migrate all Convex blobs to R2 ([632e99a](https://github.com/planetaryescape/blah.chat/commit/632e99a77b3b81c2bd36b76a3e722f586765015a))
* phase 15 - switch ALL remaining web surfaces from Convex to REST ([3137308](https://github.com/planetaryescape/blah.chat/commit/3137308d00fad960daff57746d7fef4c1010fe07))
* phase 15 - templates, projects, shares, chat components cutover ([aaf5187](https://github.com/planetaryescape/blah.chat/commit/aaf51870e7c35b2ec5c8a568b4f71d27413dccab))
* phase 15 cutover - switch web surfaces from Convex to REST/Postgres ([3ea9f68](https://github.com/planetaryescape/blah.chat/commit/3ea9f68f985e9f1c3cacc9fa8bf619800fceabfc))
* phase 15 phase I - remove Convex from client request path ([ce9f345](https://github.com/planetaryescape/blah.chat/commit/ce9f3454ec235215927974b6b0b2a382c922bbe3))
* phase 15 settings cutover + cleanup-empty route ([87f331a](https://github.com/planetaryescape/blah.chat/commit/87f331af0cb616f9c0ef9860135466a71eda9f26))
* phase 16 dead code removal - purge all Convex from web app ([524f5d6](https://github.com/planetaryescape/blah.chat/commit/524f5d606b464023ca33db727341d452035a0ff5))


### Bug Fixes

* [] add Clerk mock to web test setup and increase test timeouts ([8dbecda](https://github.com/planetaryescape/blah.chat/commit/8dbecda6dfd9cd73e53e57f673cfc3794ee14030))
* [] address latest cubic review comments ([4860cd8](https://github.com/planetaryescape/blah.chat/commit/4860cd8e2e63e36212a12ed9ad929bc50c4f2d20))
* [] address P2 review comments from cubic ([24fb1c6](https://github.com/planetaryescape/blah.chat/commit/24fb1c67d0dff86c365e245948cecf191ce0053c))
* [] align postgres persistence runtime ([62289d4](https://github.com/planetaryescape/blah.chat/commit/62289d472c087af0798149d388f7cb8f0d3cf0a7))
* [] avoid type-depth in code execution tool ([dc699c0](https://github.com/planetaryescape/blah.chat/commit/dc699c0ba9996ee01bc429fe0e205786326a14b2))
* [] compute percentSaved from MODEL_CONFIG in analyze-model-fit test ([dcb2efc](https://github.com/planetaryescape/blah.chat/commit/dcb2efc48ffa1a164a4e5297622448fb7f1c8672))
* [] fix web test infrastructure and P1 review comments ([d045eb2](https://github.com/planetaryescape/blah.chat/commit/d045eb2c352105b60828c1777e32a51f3a7b57b5))
* [] guard Convex ids in web client ([f008de3](https://github.com/planetaryescape/blah.chat/commit/f008de3ee10383c3babb5176e39fa92f33caa0b9))
* [] harden generation resume and stop ([8b0980c](https://github.com/planetaryescape/blah.chat/commit/8b0980c39035b684183cf315e8bb031d044282c4))
* [] increase PGlite test timeout for CI ([159341b](https://github.com/planetaryescape/blah.chat/commit/159341b83d74f5197fcfbe9b3d156c1c3b2dda97))
* [] increase test timeouts for CI across PGlite packages ([ab29534](https://github.com/planetaryescape/blah.chat/commit/ab295349592d67b69b9e83ae74a920500065dd36))
* [] move message metadata to postgres ([a5a88f1](https://github.com/planetaryescape/blah.chat/commit/a5a88f10d0d82ae0b31b5073a6a7dfff72d025df))
* [] point desktop build at existing icon ([516e61f](https://github.com/planetaryescape/blah.chat/commit/516e61f84fa5665dc22ff5c03bbda7b489d49dd0))
* [] suppress type depth in usePreferences ([13c8d16](https://github.com/planetaryescape/blah.chat/commit/13c8d16b4145d25a5111effacd8eb0091adfa6af))

## [1.34.0](https://github.com/planetaryescape/blah.chat/compare/v1.33.1...v1.34.0) (2026-03-13)


### Features

* add generateImageAction public wrapper delegating to trigger.dev ([98031e8](https://github.com/planetaryescape/blah.chat/commit/98031e8c047b3a47cfa3479eaaceaf495652436c))
* add trigger.dev enqueueTask helper and HTTP webhook routes ([d691483](https://github.com/planetaryescape/blah.chat/commit/d69148351b905d1fa2d41ff6a5f840fe4b2ec107))
* add trigger.dev task definitions for tiers 1-3 ([599a032](https://github.com/planetaryescape/blah.chat/commit/599a0324847e4484ff6846e08c576dd7cb192501))


### Bug Fixes

* add fetch timeout to trigger utils and forward jobId in embed-file ([bd5ec11](https://github.com/planetaryescape/blah.chat/commit/bd5ec11077672327908f1c0e7ed6e714996f6325))
* address review feedback and CI failures ([8b4f5ec](https://github.com/planetaryescape/blah.chat/commit/8b4f5ecb2b8de5b2319749e5b39f7881aa30d5d2))
* commit lockfile and package.json changes for trigger.dev deps ([f0af5ed](https://github.com/planetaryescape/blah.chat/commit/f0af5ed2dadaaf11314cd764071f10659f46f95d))

## [1.33.1](https://github.com/planetaryescape/blah.chat/compare/v1.33.0...v1.33.1) (2026-03-12)


### Bug Fixes

* fix dependabot auto-merge pipeline ([21cde5f](https://github.com/planetaryescape/blah.chat/commit/21cde5f869a8405e5e4451aebd8033dbb0b5689b))
* use PR author instead of actor for dependabot checks ([46357a2](https://github.com/planetaryescape/blah.chat/commit/46357a2ebc8382c62cbfd7120c1a013eb3314167))

## [1.33.0](https://github.com/planetaryescape/blah.chat/compare/v1.32.2...v1.33.0) (2026-03-11)


### Features

* add chat-ui-core shared package for slash commands and draft persistence ([b47b0d6](https://github.com/planetaryescape/blah.chat/commit/b47b0d69705238389405dbfc575e43b4922d31f8))
* add slash commands, draft persistence, and scroll improvements ([5f6e852](https://github.com/planetaryescape/blah.chat/commit/5f6e852c676cceb2eea2b883b756b35ed49a0cd6))


### Bug Fixes

* add trailing newlines to iOS asset JSON files ([6ae578f](https://github.com/planetaryescape/blah.chat/commit/6ae578f7a3210e6b1bd67ed1901355f2176a847f))
* address second round of PR review feedback ([7413a87](https://github.com/planetaryescape/blah.chat/commit/7413a87b9d0b03aa281a28acaaa2b483183f2439))

## [1.32.2](https://github.com/planetaryescape/blah.chat/compare/v1.32.1...v1.32.2) (2026-03-06)


### Bug Fixes

* keep temporal prefixes in prompt history only ([#402](https://github.com/planetaryescape/blah.chat/issues/402)) ([d804f2e](https://github.com/planetaryescape/blah.chat/commit/d804f2eba050a99771f51791530e6141c64e5878))

## [1.32.1](https://github.com/planetaryescape/blah.chat/compare/v1.32.0...v1.32.1) (2026-03-03)


### Bug Fixes

* trigger desktop release on tag push instead of release event ([c5a946e](https://github.com/planetaryescape/blah.chat/commit/c5a946ee15a1c026d6b4d424b6c20b6837099bd8))

## [1.32.0](https://github.com/planetaryescape/blah.chat/compare/v1.31.0...v1.32.0) (2026-03-02)


### Features

* desktop remaining review items — offline fallback, cross-platform CI, companion polish, badge API ([21de474](https://github.com/planetaryescape/blah.chat/commit/21de474e7d81d16113e6667b00934b89a1b4a3f4))


### Bug Fixes

* desktop app security, UX, and code quality overhaul ([12a9c46](https://github.com/planetaryescape/blah.chat/commit/12a9c4655ad8cb01497282cbd126d54a7398f283))

## [1.31.0](https://github.com/planetaryescape/blah.chat/compare/v1.30.0...v1.31.0) (2026-03-02)


### Features

* refine starter suggestions with cycling pool and card layout ([b6fae0a](https://github.com/planetaryescape/blah.chat/commit/b6fae0aeeb8e5dd054967b0dcfe26aeca9057675))


### Bug Fixes

* **web:** defer mermaid rendering until streaming completes ([19faeb9](https://github.com/planetaryescape/blah.chat/commit/19faeb9dabb325e6e49490ec217563412b4c0afd))

## [1.30.0](https://github.com/planetaryescape/blah.chat/compare/v1.29.0...v1.30.0) (2026-03-02)


### Features

* **a11y:** add accessibility analytics events ([ff5eba7](https://github.com/planetaryescape/blah.chat/commit/ff5eba776c35e9abda389d64adcb226bdbcf38ac))
* **a11y:** add accessibility preference schema and defaults ([312a01a](https://github.com/planetaryescape/blah.chat/commit/312a01ada6814011d05dece761975e704fb42b03))
* **a11y:** add accessibility settings UI ([cb2da93](https://github.com/planetaryescape/blah.chat/commit/cb2da93e34cae633a7fe65ff8f5f08bd062fbec0))
* **a11y:** add hook to apply accessibility classes to DOM ([2b7d7a2](https://github.com/planetaryescape/blah.chat/commit/2b7d7a2d489cb4b975b1c64eb7188cbc87fa1d1d))
* **a11y:** add keyboard navigation with vim-style shortcuts ([c785ec2](https://github.com/planetaryescape/blah.chat/commit/c785ec237c2bb35a1448fd11bf248638e7b76787))
* **a11y:** add MotionProvider for reduced motion support ([39233c1](https://github.com/planetaryescape/blah.chat/commit/39233c1b3b6cf86a1540edb2e02f5f3ddee97049))
* **a11y:** add semantic HTML accessibility improvements ([a4209a6](https://github.com/planetaryescape/blah.chat/commit/a4209a6ca687b3296bbdd78a0e59e368ad8f5214))
* **a11y:** add WCAG-compliant CSS for high contrast and text scaling ([ac9c0f7](https://github.com/planetaryescape/blah.chat/commit/ac9c0f73008980984f366c4c21ed1e0bf3e42359))
* **a11y:** bypass stream buffering when reduced motion preferred ([c865412](https://github.com/planetaryescape/blah.chat/commit/c8654120869fe4f7e77711e6dcae590a8c41116c))
* **a11y:** implement focus management for WCAG 2.4.3/2.4.7 compliance ([274a3e4](https://github.com/planetaryescape/blah.chat/commit/274a3e46be9169292d0d479c59ce2c15d21cd57e))
* add auto router enabled setting with analytics ([efaad60](https://github.com/planetaryescape/blah.chat/commit/efaad60bfa4255f3d41d6b6c97d0c687041ffcc0))
* add desktop app shell and automated release pipeline ([6dddde1](https://github.com/planetaryescape/blah.chat/commit/6dddde1e62a3d520e3d3e4a856f88e10ff74fe4c))
* **admin:** add last-active tracking and daily activity log ([02a530f](https://github.com/planetaryescape/blah.chat/commit/02a530f6c985da2e5622dca82c6657b352d29733))
* **admin:** add models and auto-router admin UI ([2b90b8b](https://github.com/planetaryescape/blah.chat/commit/2b90b8b26409549e04976b0e47ef63bbc749526e))
* **admin:** add router mode selector and classifier settings to dashboard ([668b15e](https://github.com/planetaryescape/blah.chat/commit/668b15e573f8bea0dd59e7ff0ea4b30a2c34c483))
* **admin:** make max active integrations configurable ([7d003c2](https://github.com/planetaryescape/blah.chat/commit/7d003c2da5133ef8749f6f7818ef66a28a74537b))
* **admin:** replace router model select with combobox ([d47e43f](https://github.com/planetaryescape/blah.chat/commit/d47e43f568ff81aedb222181bb9df9ed07ff2cd4))
* **admin:** use select dropdown for router model setting ([da87bdf](https://github.com/planetaryescape/blah.chat/commit/da87bdf14656c1c88a2473f0674be95b14604ccb))
* **ai:** add currency converter tool ([d34f493](https://github.com/planetaryescape/blah.chat/commit/d34f4933465c0e731ba3a250ac59b40c7fec8acd))
* **api:** harden authz and portable SSE ([3467a01](https://github.com/planetaryescape/blah.chat/commit/3467a014321477240fa8884a25959f6b1b4ecfe1))
* **auto-router:** add classifier-based model router ([a72cf45](https://github.com/planetaryescape/blah.chat/commit/a72cf454ef0af9f149588a19f9219d816026cbc8))
* **auto-router:** add EmbeddingProvider, ModelRegistry, and Router factory ([8273263](https://github.com/planetaryescape/blah.chat/commit/8273263e7e175dc2a8509134acbef8f936b7b69a))
* **auto-router:** add high-stakes topic detection ([111c339](https://github.com/planetaryescape/blah.chat/commit/111c339175fe8262fb071cbc5ad7f9d5fe0ed1e2))
* **auto-router:** add sticky routing fields to classification schema ([c8dc591](https://github.com/planetaryescape/blah.chat/commit/c8dc591774a745b42b3d1c6604df45eef3a9f0d4))
* **auto-router:** build dynamic classification prompt with previous model context ([73df0a7](https://github.com/planetaryescape/blah.chat/commit/73df0a7078ddda5a3cbb188ff237f7c47b679481))
* **auto-router:** implement sticky routing with early exit ([0539dba](https://github.com/planetaryescape/blah.chat/commit/0539dbad94a41e72c4e4b712c46dc8c920060d23))
* **backend:** add enableModelRecommendations user preference ([5397ac5](https://github.com/planetaryescape/blah.chat/commit/5397ac55e7ccdb535ebfaf0bb5ed89b143a4edf4))
* **backend:** add hapticFeedbackEnabled preference ([1b3c7eb](https://github.com/planetaryescape/blah.chat/commit/1b3c7ebc19f81fb3f015f22d5cc8f52b80b2cde3))
* **backend:** add tool result data boundary for prompt injection protection ([f9334d2](https://github.com/planetaryescape/blah.chat/commit/f9334d22b196df799762284a7486e14ef0018300))
* **backend:** add tree architecture migration script ([2acc8be](https://github.com/planetaryescape/blah.chat/commit/2acc8be6c8cb1e24f42d1217ef74debf6d1f5094))
* **backend:** add tree queries and update message creation for P7 ([8029d5a](https://github.com/planetaryescape/blah.chat/commit/8029d5a15e8701689e1514ad46fc934e603d45c6))
* **backend:** add tree traversal utilities for message architecture ([7974fe2](https://github.com/planetaryescape/blah.chat/commit/7974fe2a46b6e05446d84fc925c61a3ce08c3941))
* **backend:** filter messages by active branch in getConversationMessages ([5f5b74f](https://github.com/planetaryescape/blah.chat/commit/5f5b74f795e5c73911c0098fa01bdb603f457763))
* **backend:** update chat mutations for tree-based branching (P7) ([49d4f53](https://github.com/planetaryescape/blah.chat/commit/49d4f53bf0de626a2007dc6a3cceb7f7aeebc97c))
* **cache:** update Dexie schema v5 for tree architecture ([7b9135c](https://github.com/planetaryescape/blah.chat/commit/7b9135c079596d56bc6e76308bf6733db099081b))
* **chat:** add StatusTimeline for tool execution progress ([8942cda](https://github.com/planetaryescape/blah.chat/commit/8942cda16be03e09a127c6dd69c61b0cf6ae449f))
* **chat:** add useHoverIntent hook for delayed hover states ([cce0e03](https://github.com/planetaryescape/blah.chat/commit/cce0e0395098bb659aa2d47dd118a15088369f62))
* **chat:** add web worker for markdown parsing ([cb8862d](https://github.com/planetaryescape/blah.chat/commit/cb8862d2084996c2f397c9fc31ea7f24199cd72d))
* **chat:** apply hover delay to message action menus ([fb0645a](https://github.com/planetaryescape/blah.chat/commit/fb0645a68bd3e679b5be13d821ca62ffa2070735))
* **chat:** display sticky routing indicator in message stats ([6409bbb](https://github.com/planetaryescape/blah.chat/commit/6409bbbd08510c5ac5d2158032e0fe816ffabd6a))
* **chat:** enhance typing indicator with model name ([f08700a](https://github.com/planetaryescape/blah.chat/commit/f08700afe53a1c45d4f22353e1446e5090c7b266))
* **chat:** integrate haptic feedback on send, copy, stop, delete ([f5c7dac](https://github.com/planetaryescape/blah.chat/commit/f5c7daccbcce7bb35fca8c7d7c0e6623d82f41c9))
* **chat:** integrate StatusTimeline in AI messages ([735db13](https://github.com/planetaryescape/blah.chat/commit/735db13455163c0312e5d8f11e7621509e6fe6cf))
* **cli:** add debug command and fix search query param ([d270926](https://github.com/planetaryescape/blah.chat/commit/d2709268110dac3475c2dc5f06783a56f9a1f029))
* **cli:** add multi-platform distribution support ([98feff1](https://github.com/planetaryescape/blah.chat/commit/98feff15dfb5da02146f89bd1e47e71ea6019935))
* **cli:** add release workflow and compile script ([85e1f09](https://github.com/planetaryescape/blah.chat/commit/85e1f09ace8a72d74eb66d0de9181ace3c72c650))
* **cli:** add tree-sitter syntax highlighting support ([e4bc651](https://github.com/planetaryescape/blah.chat/commit/e4bc651c1b7c43c4798151c3db343fbe68cc112d))
* **clients:** migrate clients to SDK transport ([864908c](https://github.com/planetaryescape/blah.chat/commit/864908c29f8957c854c28b0e98f7b5771164bd66))
* **cli:** improve components for OpenTUI rewrite ([14f5f03](https://github.com/planetaryescape/blah.chat/commit/14f5f035a0b19e698ad3daf9a0297da401cee688))
* cognitive memory v1 ([21e8bb7](https://github.com/planetaryescape/blah.chat/commit/21e8bb7b4026a5975b02209a8b9d0f1b0eb0be62))
* **cognitive-memory:** access frequency reinforcement ([5f2d737](https://github.com/planetaryescape/blah.chat/commit/5f2d737249eabcd5b490f9fb4bf0aa5f46e23041))
* **cognitive-memory:** add postgres and jsonl adapters ([1d1475a](https://github.com/planetaryescape/blah.chat/commit/1d1475ab1ea2015ca47dc1cd9d3ede53cd3cd2b7))
* **composio:** add integrations indicator in chat input ([ebea740](https://github.com/planetaryescape/blah.chat/commit/ebea740883571291ec217ab388ea85b5fd085953))
* **composio:** add svgl icons and improve settings UI ([0cf2bb5](https://github.com/planetaryescape/blah.chat/commit/0cf2bb571c2e9b6591f93a6d8c8ebf4d774aef3f))
* **composio:** curate integrations to 50 high-value services ([2abf0e2](https://github.com/planetaryescape/blah.chat/commit/2abf0e229e8d75a5c5d55e16ebeefef1d963a780))
* **composio:** improve tools integration and logging ([0778292](https://github.com/planetaryescape/blah.chat/commit/0778292e3b5eb57d607a1e47f1be4a8b1c0cb3de))
* **composio:** restore 500+ integrations after OAuth fix ([196ceaa](https://github.com/planetaryescape/blah.chat/commit/196ceaadc8479fa45ec7a56d2f257d45872d5dc3))
* desktop companion controls ([503fe2e](https://github.com/planetaryescape/blah.chat/commit/503fe2e9aea9ad48b9d1f948914470113df77b00))
* **desktop:** add update check and one-click install flow ([28d0842](https://github.com/planetaryescape/blah.chat/commit/28d0842935d344eaef93e957f3fd3da7cbac113d))
* **generation:** propagate isSticky field through generation pipeline ([669374a](https://github.com/planetaryescape/blah.chat/commit/669374a596fb5285dc97d5fadca8f7d7279e5d0f))
* **hooks:** add tree data cache sync hooks ([7a1fb0f](https://github.com/planetaryescape/blah.chat/commit/7a1fb0f244bc3c93c6efaffa3b68680a9ef92c0b))
* **hooks:** add useBranchComparison hook for branch state management ([4fa2588](https://github.com/planetaryescape/blah.chat/commit/4fa25881e5e4db38ba9473f28f39e9127536cb68))
* **hooks:** add useHaptic hook ([d8bc365](https://github.com/planetaryescape/blah.chat/commit/d8bc3655e440b176f251570893b60a9380585354))
* **integrations:** add Composio integration for external service tools ([208d28c](https://github.com/planetaryescape/blah.chat/commit/208d28ca5d4ef45dc123036ae3dfc418b3b436b2))
* **lib:** add haptic feedback utility ([30484f1](https://github.com/planetaryescape/blah.chat/commit/30484f107d8ffca270c83ea389d1dffd0ea23041))
* **mobile:** add Android project scaffolding ([f5b31e5](https://github.com/planetaryescape/blah.chat/commit/f5b31e5e402156df73014d73335f59a7d2405f5f))
* **mobile:** add bookmark and save-as-note actions to messages ([5ddeedd](https://github.com/planetaryescape/blah.chat/commit/5ddeeddcc168f5f37851d03dfd207bdaacd33c9d))
* **mobile:** add branch navigation UI components ([9513d7e](https://github.com/planetaryescape/blah.chat/commit/9513d7eded13c1c904b93660da8fb7676c238423))
* **mobile:** add design system tokens and migrate hardcoded values ([04f0c79](https://github.com/planetaryescape/blah.chat/commit/04f0c7996f7a272e2625a9dfb5131d16d9483a16))
* **mobile:** add drawer navigation with conversation search and project filtering ([748ede0](https://github.com/planetaryescape/blah.chat/commit/748ede0bd3ce3b7e7558502078db04c6fd1a1e79))
* **mobile:** add hooks for bookmarks and notes ([8601c0e](https://github.com/planetaryescape/blah.chat/commit/8601c0eb6e309bd86acf61cc12a317753233410c))
* **mobile:** add hooks for sibling navigation and message actions ([67cd5d9](https://github.com/planetaryescape/blah.chat/commit/67cd5d9c11ea918c8efad69747af0ec14dd4d36f))
* **mobile:** add notes navigation to drawer ([3a90e2b](https://github.com/planetaryescape/blah.chat/commit/3a90e2b81e46bd2e01e70db0cb05ee48fd95d697))
* **mobile:** add notes screens with auto-tag and sharing ([f1b0ba7](https://github.com/planetaryescape/blah.chat/commit/f1b0ba78f1c98e7f517e1698b960465bf17ef377))
* **mobile:** add notes UI components ([abeca6d](https://github.com/planetaryescape/blah.chat/commit/abeca6df76ad12ef28ed2433f9c1f4bba4241071))
* **mobile:** add rich content rendering to chat messages ([437b03b](https://github.com/planetaryescape/blah.chat/commit/437b03b4d4e994a0a3a475a52c313700be7e201e))
* **mobile:** add settings screen with full preference management ([f1cd204](https://github.com/planetaryescape/blah.chat/commit/f1cd204b58163d36d962e239e486e7ff0fb29832))
* **mobile:** add syntax highlighting with react-native-code-highlighter ([15c29c7](https://github.com/planetaryescape/blah.chat/commit/15c29c7e17c860e804662e53488233fd9dd520cd))
* **mobile:** add typed Convex API, ErrorBoundary, and accessibility ([e6c8e6c](https://github.com/planetaryescape/blah.chat/commit/e6c8e6cc01c89300e0d5ee09a3906b4a445123f8))
* **mobile:** filter messages by active branch ([fedc446](https://github.com/planetaryescape/blah.chat/commit/fedc446ccd8cd7466c192ae315b7340c9f0b38e6))
* **mobile:** full-width assistant messages, compact user bubbles ([c3a19b4](https://github.com/planetaryescape/blah.chat/commit/c3a19b4f1c1c76e3d3faf72d389319ed9791a425))
* **mobile:** haptic feedback when streaming starts ([31f458e](https://github.com/planetaryescape/blah.chat/commit/31f458e1c0db20bba173b62966eee5ca1d8748c2))
* **mobile:** increase chat input max expand height to 200px ([da98a45](https://github.com/planetaryescape/blah.chat/commit/da98a4577ff23a138aef445e0f0d8d209a5f815c))
* **mobile:** integrate branch navigation into message components ([916d976](https://github.com/planetaryescape/blah.chat/commit/916d9762c7986fe44ddf520503290329bfa654af))
* **mobile:** production-quality chat with dark theme and proper ordering ([cfe6188](https://github.com/planetaryescape/blah.chat/commit/cfe618854fad590a8df8da65134b96edbfc3daba))
* **mobile:** wire up branch actions in chat screen ([2e53ea3](https://github.com/planetaryescape/blah.chat/commit/2e53ea38af1fdf306cbaf6d4d0694c9a6a13cc77))
* **models:** add CLI for model management ([9904426](https://github.com/planetaryescape/blah.chat/commit/9904426d2e2a08aa6ce47fe7cf44fa707b1487b3))
* **models:** add database-backed model management ([325cb99](https://github.com/planetaryescape/blah.chat/commit/325cb996cbe076ab621f4c36bbbdcdee86b05b00))
* **models:** add Kimi K2.5 to static config for UI ([549c9a8](https://github.com/planetaryescape/blah.chat/commit/549c9a88bbce04ae7d12552c9f3be06f4571b8d2))
* **models:** migrate UI from static MODEL_CONFIG to database ([6fff32f](https://github.com/planetaryescape/blah.chat/commit/6fff32fd5df6be20c87028c96587ec8e9d436a7d))
* refresh app icons and opengraph assets ([84afc03](https://github.com/planetaryescape/blah.chat/commit/84afc03fb50dbae9529c3948bd1f3d8d688051c9))
* **schema:** add tree-based message architecture fields (P7) ([d704352](https://github.com/planetaryescape/blah.chat/commit/d7043521360676f327408ac056643c1a7686f4bf))
* **sdk:** add publish-ready typed SDK ([002152b](https://github.com/planetaryescape/blah.chat/commit/002152ba3a0c276316d11f5327067efc43cb9a37))
* **settings:** add haptic feedback toggle to UI settings ([ce2a3f4](https://github.com/planetaryescape/blah.chat/commit/ce2a3f4e9bd4c0425a9f6958b1820a22f974e0be))
* **settings:** wire hapticFeedbackEnabled to settings state ([4b23804](https://github.com/planetaryescape/blah.chat/commit/4b23804ee509deb1d62572859efca60ef8743177))
* **share:** add dynamic OG metadata to share pages ([f98494d](https://github.com/planetaryescape/blah.chat/commit/f98494d76f6ef698767a6145ef60f303c3931fc1))
* **shares:** add server-side metadata fetcher for OG tags ([ef05c36](https://github.com/planetaryescape/blah.chat/commit/ef05c36157990cf27fc3d4722b3684daf3673c67))
* **streaming:** add buffer state tracking to useStreamBuffer ([65d3ed2](https://github.com/planetaryescape/blah.chat/commit/65d3ed20b6d98125995894ce46cc18280b183aa2))
* **tree:** add context, descendants, and subtree deactivation helpers ([7a6b4cf](https://github.com/planetaryescape/blah.chat/commit/7a6b4cf0b0dd28c63261bb37c10e80096fa05eb4))
* **ui:** add branch navigation components for tree architecture ([bb4b756](https://github.com/planetaryescape/blah.chat/commit/bb4b756d034fc3c506f7df094128c963cdc051b2))
* **ui:** add BranchComparisonSheet for side-by-side version comparison ([a96efe6](https://github.com/planetaryescape/blah.chat/commit/a96efe6d085fcb0dc1b284f28fdfdd048608e3e0))
* **ui:** add compare button to MessageBranchIndicator ([5d0df0f](https://github.com/planetaryescape/blah.chat/commit/5d0df0f09f3ada3e559804a8c49afc340306843b))
* **ui:** add Google service icons for integrations ([9cc4caa](https://github.com/planetaryescape/blah.chat/commit/9cc4caa2edc0434686e2241d63168d49a9227fe0))
* **ui:** add SVG icons for curated integrations ([bb4f74c](https://github.com/planetaryescape/blah.chat/commit/bb4f74c4a36ea1ed7512dc53d86fc8a6aed9c198))
* **web:** add desktop updater manifest endpoint ([7f5fe3c](https://github.com/planetaryescape/blah.chat/commit/7f5fe3ccfe09dac62ed8ee03f854eb5f77b1db6c))
* **web:** add message timestamps and date separators ([3b376b0](https://github.com/planetaryescape/blah.chat/commit/3b376b072e35beb06cf6e596feb316f846208ce6))
* **web:** add UI controls for model recommendations preference ([01c08f5](https://github.com/planetaryescape/blah.chat/commit/01c08f56216ff875908285d57e9575405e6bfa73))


### Bug Fixes

* **a11y:** add fallback defaults for a11y preferences ([87280a2](https://github.com/planetaryescape/blah.chat/commit/87280a217636931a2587947470771cb08eaad089))
* **a11y:** address PR review feedback ([08ee45f](https://github.com/planetaryescape/blah.chat/commit/08ee45f056413ae912798cc0b58871d2c6e3b3ce))
* **a11y:** address PR review feedback ([cc07269](https://github.com/planetaryescape/blah.chat/commit/cc07269332f7a8f9011f18170f5c0a38bbdcd167))
* **a11y:** address PR review feedback ([5cb940a](https://github.com/planetaryescape/blah.chat/commit/5cb940a573c2f6e46b105692b94e2a97ce951f9f))
* **a11y:** combine effects to avoid classList race condition ([c4368c7](https://github.com/planetaryescape/blah.chat/commit/c4368c7422b6a3207571c2366380435e866e07b0))
* **a11y:** remove unused return from side-effect hook ([d1ee344](https://github.com/planetaryescape/blah.chat/commit/d1ee344ac03c848fd0faf898c16e3f77f0610cd2))
* add autoRouterEnabled and showSlides to preferences schema ([37e7fbb](https://github.com/planetaryescape/blah.chat/commit/37e7fbb6639e4f1561d464ae1c78000a9e70497d))
* add head_sha fallback for dependabot PR lookup ([f47ad3a](https://github.com/planetaryescape/blah.chat/commit/f47ad3a25bc1843ca477fe34d7ba3a7cf0c84880))
* add high-stakes fields to routing decision validators ([9b11480](https://github.com/planetaryescape/blah.chat/commit/9b114801d9700e07e9d0c5a113f97c76124af210))
* add null guard instead of type assertion for stableCode ([da732f2](https://github.com/planetaryescape/blah.chat/commit/da732f29406bb675de55b15847d5bec5043072fc))
* add outbound tool-name diagnostics on generation failures ([3a60fbe](https://github.com/planetaryescape/blah.chat/commit/3a60fbec3b257b87c5f726ae2c7303e3e84f6e91))
* address CI failures and PR review comments ([ac17973](https://github.com/planetaryescape/blah.chat/commit/ac17973fdcea28b2eae44fe9bd0db586cc3007f4))
* address code review feedback ([3416d9f](https://github.com/planetaryescape/blah.chat/commit/3416d9f4f80c60abf1febb130aa118479f2e6d80))
* address code review feedback and CI failures ([bc56b4f](https://github.com/planetaryescape/blah.chat/commit/bc56b4f9acafdd878ba7b3ed94e0275d689261e1))
* **admin:** address code review feedback ([7d5ab1c](https://github.com/planetaryescape/blah.chat/commit/7d5ab1c2e1a99a31a76016a3f64998e6a14c0398))
* **admin:** fix page overflow and scrolling issues ([db14be5](https://github.com/planetaryescape/blah.chat/commit/db14be54f047eb561d1fbc97492ab1717457711f))
* **admin:** replace native confirm() with AlertDialog ([64967d6](https://github.com/planetaryescape/blah.chat/commit/64967d6d0d7b0602deed314c6f861190af888dae))
* **admin:** replace native dialogs with shadcn components ([6e19bd8](https://github.com/planetaryescape/blah.chat/commit/6e19bd8f7f267e64fefc00bdf30f41309fbd70ba))
* **admin:** wrap ScrollArea properly for correct overflow handling ([f4667cb](https://github.com/planetaryescape/blah.chat/commit/f4667cb14b035dae1d6e0f9667cf7d594c5fb153))
* **ai:** correct Frankfurter API endpoint and add response typing ([0a86ac0](https://github.com/planetaryescape/blah.chat/commit/0a86ac00921109a0bf0c0f083fb0eb6ef887a1bb))
* **ai:** use URLSearchParams and add 10s timeout for currency converter ([524df55](https://github.com/planetaryescape/blah.chat/commit/524df552fe9b54a4d3d22b1b82ce0982ecafa7ee))
* allow bible:// protocol in Streamdown link safety ([7e85358](https://github.com/planetaryescape/blah.chat/commit/7e85358aa77744927ac33ca1182f8d6611736633))
* allow manual production deploy dispatch ([#384](https://github.com/planetaryescape/blah.chat/issues/384)) ([7767cd7](https://github.com/planetaryescape/blah.chat/commit/7767cd76b47f0478d4a153e7eaf09108c423a190))
* allow unauthenticated desktop updater endpoint ([7cc96fc](https://github.com/planetaryescape/blah.chat/commit/7cc96fc2edd11626ecf98b3df320906296df3c9c))
* async desktop notarization finalize ([#307](https://github.com/planetaryescape/blah.chat/issues/307)) ([2889a04](https://github.com/planetaryescape/blah.chat/commit/2889a042ce91a5071988e1404b0dff492df2d84f))
* async desktop notarization without wait ([2889a04](https://github.com/planetaryescape/blah.chat/commit/2889a042ce91a5071988e1404b0dff492df2d84f))
* **auto-router:** validate capabilities before sticky routing ([21399c0](https://github.com/planetaryescape/blah.chat/commit/21399c049f31506de5ddd17ab4d7f3ac06f811de))
* avoid waiting for desktop notarization ([6a8841d](https://github.com/planetaryescape/blah.chat/commit/6a8841d2a8534c85923c15866283e6b2418494ac))
* **backend:** add missing getUserPreferenceState query ([ba4908d](https://github.com/planetaryescape/blah.chat/commit/ba4908dcca7f9864b92abaf1a2b51531628c70a4))
* **backend:** deactivate descendants when editing message ([fd2ee5f](https://github.com/planetaryescape/blah.chat/commit/fd2ee5fb07f5cfd8659182ebb967b60f0c8db664))
* **backend:** gracefully handle AI provider errors in title generation ([557a2cf](https://github.com/planetaryescape/blah.chat/commit/557a2cf79fcd32925f084599b2fb340710e51703))
* **backend:** log usage tracking errors in title generation ([df553fd](https://github.com/planetaryescape/blah.chat/commit/df553fd42384e131ee35b85db44d13a3e9db35b0))
* **backend:** move native deps to optionalDependencies for mobile builds ([e9fad60](https://github.com/planetaryescape/blah.chat/commit/e9fad60c705ff649b4c112c4d18b5418f5d7e13c))
* **backend:** query children by both parentMessageIds and parentMessageId ([e4e92de](https://github.com/planetaryescape/blah.chat/commit/e4e92de1bcb54db8103380da5fe249618c28cbc0))
* build convex deps in production deploy ([b5f3726](https://github.com/planetaryescape/blah.chat/commit/b5f372684d30c892e5bc05c1bb5101078051af99))
* build workspace deps before convex production deploy ([#385](https://github.com/planetaryescape/blah.chat/issues/385)) ([b5f3726](https://github.com/planetaryescape/blah.chat/commit/b5f372684d30c892e5bc05c1bb5101078051af99))
* capture stableCode in closure to prevent async race conditions ([dfd264c](https://github.com/planetaryescape/blah.chat/commit/dfd264cf7e0d88deba2a9b2fac62f1a5f57c4fca))
* **chat:** debounce mermaid rendering to prevent streaming errors ([f0a5dfb](https://github.com/planetaryescape/blah.chat/commit/f0a5dfbbfbaa0c7e59920d82b97d05ed51053c6a))
* **chat:** extract conversationId from branchFromMessage result ([2765d70](https://github.com/planetaryescape/blah.chat/commit/2765d7027939b49ed4a5b458463c6f2b4ba83161))
* **chat:** graceful StatusTimeline exit animation and aria-busy string ([cc43b6d](https://github.com/planetaryescape/blah.chat/commit/cc43b6d4a0e4aa60582e1d0b4284cc23a36a59fa))
* **chat:** improve mobile UX for input focus and message display ([76c7277](https://github.com/planetaryescape/blah.chat/commit/76c72779cba151b9fa529963b67a1c90c4882b84))
* **chat:** prevent toolbar buttons from triggering form submission ([808a221](https://github.com/planetaryescape/blah.chat/commit/808a2211f18f0229be0229a2697572096d652677))
* **chat:** use padding instead of margin for Virtuoso height measurement ([364e55d](https://github.com/planetaryescape/blah.chat/commit/364e55d0d658fbc0035f95ea78d9ea1f57167146))
* **ci:** add checkout step to dependabot auto-merge workflow ([5028263](https://github.com/planetaryescape/blah.chat/commit/5028263b9a2e40c46e230d89c66bcfafa082f9a7))
* **ci:** build app+dmg for desktop updater artifacts ([69f7924](https://github.com/planetaryescape/blah.chat/commit/69f7924183581af94f0c417fc4c2da84a51c6603))
* **ci:** fallback portable check when rg missing ([de77b42](https://github.com/planetaryescape/blah.chat/commit/de77b427ab1d440253b7bd5b04ada88e30b3666a))
* **ci:** handle shallow sdk version check ([998441c](https://github.com/planetaryescape/blah.chat/commit/998441c2931e35f2f60724a97e550eee1306df8e))
* **ci:** repair desktop notarization parsing scripts ([aa58459](https://github.com/planetaryescape/blah.chat/commit/aa58459fa60fff1cf643dd02fd506ed06013c321))
* **ci:** restore valid desktop release workflow yaml ([6f6ca79](https://github.com/planetaryescape/blah.chat/commit/6f6ca79dc682765b8ef7db08c9c1f2b7afcbda9d))
* **ci:** restore valid incognito stale query ([d84d021](https://github.com/planetaryescape/blah.chat/commit/d84d0212b191209d89728526249b43fe00da0468))
* **ci:** stabilize failing PR checks ([cc2412f](https://github.com/planetaryescape/blah.chat/commit/cc2412f40e66e4d8c3be060b60a0e392ca3e70b6))
* **ci:** stop actions approving PRs ([947f6fd](https://github.com/planetaryescape/blah.chat/commit/947f6fdf7de012b684b3497d99367394b34cd910))
* **ci:** sync lockfile and unblock checks ([36b09f0](https://github.com/planetaryescape/blah.chat/commit/36b09f0b941aa0380ae9a359c93704f95593e3e6))
* **ci:** use draft-then-publish for immutable releases ([8056fc7](https://github.com/planetaryescape/blah.chat/commit/8056fc773a4ec30aa5b02b85ed072e397cf4727f))
* **ci:** use macos-13 for darwin-x64 CLI builds ([#276](https://github.com/planetaryescape/blah.chat/issues/276)) ([801280d](https://github.com/planetaryescape/blah.chat/commit/801280d63addc175130d3637e3e059024e2da087))
* **ci:** use macos-15-large for darwin-x64 (macos-13 retired) ([cf707a0](https://github.com/planetaryescape/blah.chat/commit/cf707a0a9bbe7f46bb644f7e262383c46977b5b5))
* **ci:** use macos-15-large for darwin-x64 CLI builds ([382be1b](https://github.com/planetaryescape/blah.chat/commit/382be1b224d538482c3cd5161e3f2dc28432e2d4))
* **ci:** use MERGE_BOT_TOKEN for automerge approvals ([082f5cd](https://github.com/planetaryescape/blah.chat/commit/082f5cd7aafce156aa328a36f5733404201e4896))
* **ci:** use tab delimiter when parsing gh release list ([f3de5bc](https://github.com/planetaryescape/blah.chat/commit/f3de5bcc41fb8465197bcbe28cdc091db2f28b90))
* **cli:** address PR review issues ([6651ee7](https://github.com/planetaryescape/blah.chat/commit/6651ee7afe5ed735cd7d2129f87083bea0cb2566))
* **cli:** await async actions and add --api-key login option ([4f67ad9](https://github.com/planetaryescape/blah.chat/commit/4f67ad94fc952171a0841bea552a28683b0421d6))
* **cli:** bind chat input value so it clears after send ([7a0314c](https://github.com/planetaryescape/blah.chat/commit/7a0314c3ec3c5559b08e3143c6fd5c1397d0ee79))
* **cli:** install cross-platform opentui binaries before compile ([917e656](https://github.com/planetaryescape/blah.chat/commit/917e65656379b92bfac1e6cb4b8cb638613d368e))
* **cli:** resolve parser.worker.js from package root ([9882e32](https://github.com/planetaryescape/blah.chat/commit/9882e3231d94bbaa64640590e1754a2a3f45a240))
* **cli:** resolve TreeSitter worker path in compiled binary ([247c92c](https://github.com/planetaryescape/blah.chat/commit/247c92cc03b68b9d9b55c82ccc3f5e5b5a8aa429))
* **cli:** split scoped package name in postinstall path join ([a84c231](https://github.com/planetaryescape/blah.chat/commit/a84c231256576ccde60969967e79205a85dc2f89))
* **cli:** split scoped package name into path segments for join() ([b81c5d6](https://github.com/planetaryescape/blah.chat/commit/b81c5d69ffdb37928f386937c42c273114b28450))
* **cli:** use Bun.build with solid plugin for JSX transform ([5d4de40](https://github.com/planetaryescape/blah.chat/commit/5d4de402e563233aecf62a95a57c812b08927cef))
* **cli:** use cli-v tag format and remove darwin-x64 ([68dd7ad](https://github.com/planetaryescape/blah.chat/commit/68dd7ad762a3bbb252ea3449872a3fa675edacd6))
* **cli:** use native runners for cross-platform builds ([45148d5](https://github.com/planetaryescape/blah.chat/commit/45148d5302307ae0d5c6a5396603d969b80ed1a5))
* **cli:** use PowerShell Compress-Archive on Windows ([e086fb1](https://github.com/planetaryescape/blah.chat/commit/e086fb18e1d3ca4b39c48aa11cc6a140368fa787))
* **cognitive-memory:** jsonl rollover preserves history ([2d7a34b](https://github.com/planetaryescape/blah.chat/commit/2d7a34b5a97955720cbb6e3f8a3e214a5bcae87d))
* **cognitive-memory:** postgres linked memories bidirectional ([220005d](https://github.com/planetaryescape/blah.chat/commit/220005d43e35b889ce49990953ac918c91c7bd51))
* **composio:** fix Convex runtime and Composio SDK API issues ([6fea169](https://github.com/planetaryescape/blah.chat/commit/6fea169ff2632953a5cbb9604185fcb084cea844))
* **composio:** include CSRF state in OAuth callback URL ([acfde25](https://github.com/planetaryescape/blah.chat/commit/acfde253e34dd1acae93d827d08abbe3cc64feef))
* **composio:** preserve active status during re-auth to prevent tool access loss ([5bc0943](https://github.com/planetaryescape/blah.chat/commit/5bc0943244ce323bb55fe3a83545739ca03d46e7))
* **composio:** prioritize connectedAccountId param, add verification note ([de7060a](https://github.com/planetaryescape/blah.chat/commit/de7060a562a665277b8b35a546506123a4ed6098))
* **composio:** reduce to 10 OAuth integrations for reliability ([dee657b](https://github.com/planetaryescape/blah.chat/commit/dee657b1dd8663acdf7e22812e2885964f72fdf5))
* configure EAS to use bun install ([91b4abf](https://github.com/planetaryescape/blah.chat/commit/91b4abf447b8122f5e0a885ecc7ecf545a2132a2))
* **conversations:** resolve bulk delete byte limit error ([3ada05d](https://github.com/planetaryescape/blah.chat/commit/3ada05d17e74a00eb0c8550e66c34b50ae6e8268))
* dependabot auto-merge workflow chain ([c9d45ad](https://github.com/planetaryescape/blah.chat/commit/c9d45adc6121fe3aae1a297fc2a0c01b0f82d17c))
* detect dependabot PR number from workflow_run payload ([4f2dc10](https://github.com/planetaryescape/blah.chat/commit/4f2dc1035b052ffe1be1f11ffdea403f2904f3f0))
* enforce tool name limits at generation preflight ([59a311c](https://github.com/planetaryescape/blah.chat/commit/59a311c61325481f6c3cb53550dd8f84113a7d87))
* expose desktop updater route as public ([#387](https://github.com/planetaryescape/blah.chat/issues/387)) ([7cc96fc](https://github.com/planetaryescape/blah.chat/commit/7cc96fc2edd11626ecf98b3df320906296df3c9c))
* **generation:** calculate TPS using pure API wait time ([46354b9](https://github.com/planetaryescape/blah.chat/commit/46354b99647351a8f5d59f2bd96ce50b2356497c))
* **generation:** include tool-call chunks in TPS wait time ([3376aa3](https://github.com/planetaryescape/blah.chat/commit/3376aa3d5ec12080904bcc1fe12b01351f017c5b))
* handle missing premium models for high-stakes queries ([f903e06](https://github.com/planetaryescape/blah.chat/commit/f903e066b18f05a5e6464d2ab4a66e0b39e77cee))
* harden desktop release checks and docs ([c3370ea](https://github.com/planetaryescape/blah.chat/commit/c3370eab3a770ff9ee9b4a9360894d69bc2b3bf0))
* harden tool name collision handling ([edc26a7](https://github.com/planetaryescape/blah.chat/commit/edc26a7caa929c12cc511354aad363be75c11938))
* harden touch chat input focus stability ([5291ac0](https://github.com/planetaryescape/blah.chat/commit/5291ac08abd9464c6cf9fe9a430e10c3969a8831))
* improve internal tool priority when Composio active ([57911e0](https://github.com/planetaryescape/blah.chat/commit/57911e06ec552525614c85f5fc10378440f20ad5))
* **install:** use INSTALL_DIR for PATH instead of hardcoded path ([fd2497a](https://github.com/planetaryescape/blah.chat/commit/fd2497afb1a93a7e8c327cce8720936b64f79bd4))
* make chat timeline tree-aware and deterministic ([0468503](https://github.com/planetaryescape/blah.chat/commit/046850323d729f790574707bf1f1a581eedd6232))
* make isHighStakes optional for backward compatibility ([abc8bb8](https://github.com/planetaryescape/blah.chat/commit/abc8bb81adc0baeab60e936611e5cd9d074ea361))
* **markdown:** allow bible:// protocol in rehype-harden ([d458222](https://github.com/planetaryescape/blah.chat/commit/d458222af0c1486e3488a73d9c7dbd9d0673ba1e))
* **markdown:** remove rehypeSanitize blocking bible:// links ([7792a2e](https://github.com/planetaryescape/blah.chat/commit/7792a2e4bd4ac48896ac129c918eaf519feb3504))
* **memory:** prevent timer leaks in TTS and copy handlers ([e746a0c](https://github.com/planetaryescape/blah.chat/commit/e746a0c78459f515f3c526d6a66a826925011625))
* mobile new chat access ([98f0012](https://github.com/planetaryescape/blah.chat/commit/98f0012af9489acefc9c37a8fbb7315459553e4d))
* **mobile,web:** new chat button + sidebar auto-close + SSR header visibility ([6a3cd92](https://github.com/planetaryescape/blah.chat/commit/6a3cd92176686dbb363df569ab9a548727c1bbaa))
* **mobile:** add diagnostic overlay for TestFlight connection failure ([208f1f4](https://github.com/planetaryescape/blah.chat/commit/208f1f4af085d217631bd5b9a4311fe9697c6e84))
* **mobile:** add eas-build-pre-install hook for bun detection ([44598b1](https://github.com/planetaryescape/blah.chat/commit/44598b1774ff98e9ec8a1d52b52f7708a6a7a83f))
* **mobile:** add eas-build-pre-install to mobile package.json ([f3fd53c](https://github.com/planetaryescape/blah.chat/commit/f3fd53c94b15e56acbacaba9eb61e38e9341bd87))
* **mobile:** add empty bun.lockb for EAS package manager detection ([e3b3187](https://github.com/planetaryescape/blah.chat/commit/e3b318735005b440accf35f3f23a8c3e7510fc94))
* **mobile:** add external browser fallback for Mermaid diagrams ([5e1ee8a](https://github.com/planetaryescape/blah.chat/commit/5e1ee8a5a198d9327177ba7448515114bba21e05))
* **mobile:** address security issues from code review ([de7933e](https://github.com/planetaryescape/blah.chat/commit/de7933e3d00094730a59decaeee978b50ec2dc7e))
* **mobile:** audit phase A/B — parser fix, design system, typed API ([2a63d6b](https://github.com/planetaryescape/blah.chat/commit/2a63d6b0d49cacdda14a68970c492108e3a32d4d))
* **mobile:** balance user bubble padding (16h x 8v) ([72915eb](https://github.com/planetaryescape/blah.chat/commit/72915eb39cc7297d41462f45fcf3b1f76abe4b5d))
* **mobile:** check typeof for optimistic ID detection ([6bdbdaf](https://github.com/planetaryescape/blah.chat/commit/6bdbdafa0bc41348bc403fdbb7ac4d7d99fb8cfd))
* **mobile:** delete lockfile in pre-install to bypass frozen-lockfile ([b10f696](https://github.com/planetaryescape/blah.chat/commit/b10f696c9a21822b74906ac2fe21ca3d09ac41aa))
* **mobile:** fix refractor crash by shimming it out in Metro ([b55825b](https://github.com/planetaryescape/blah.chat/commit/b55825bebfa69d8e21d3892421c34fa20f3d3d55))
* **mobile:** handle email verification step during sign-in ([a30ccf4](https://github.com/planetaryescape/blah.chat/commit/a30ccf46791bd41c3c33835a2ef1c7f2d0d8b27a))
* **mobile:** handle Mermaid CDN failure gracefully ([8abce84](https://github.com/planetaryescape/blah.chat/commit/8abce84840eb593395626cd8e6665c1ba0f640db))
* **mobile:** improve LaTeX detection and fallback rendering ([0b79d8e](https://github.com/planetaryescape/blah.chat/commit/0b79d8e9f7c80cbbb9ac5cbcfa247808f65c8617))
* **mobile:** improve WebView detection and LaTeX fallback ([31ab479](https://github.com/planetaryescape/blah.chat/commit/31ab4794625d9a1448778b8e954d3558bdd9e9d6))
* **mobile:** include bun.lock in EAS builds for package manager detection ([1954360](https://github.com/planetaryescape/blah.chat/commit/1954360690aece8380a2049d12311c6be59bca4a))
* **mobile:** increase chat text weight to medium ([639f98f](https://github.com/planetaryescape/blah.chat/commit/639f98fdeb75cdcfbffcfe3b6b51dce79a14cf22))
* **mobile:** increase dedup window to 30s for slow networks ([3f64e81](https://github.com/planetaryescape/blah.chat/commit/3f64e81ec8be3dec068acacebc5bed2c92522fdb))
* **mobile:** keep bun lockfile for EAS ([ed55fcd](https://github.com/planetaryescape/blah.chat/commit/ed55fcdd7e8a54a9907115bcced295f44f4afcc1))
* **mobile:** make Bible verse links inline with Text onPress ([6be6087](https://github.com/planetaryescape/blah.chat/commit/6be6087c2fa3d55714fbbb66b1ede51184bdf1f4))
* **mobile:** match Bible verse link color to web primary ([68535e5](https://github.com/planetaryescape/blah.chat/commit/68535e564e9eddde7b5fee3fe6b64aee54965b71))
* **mobile:** pin react to 19.1.0 to match react-native 0.81.5 ([d553f55](https://github.com/planetaryescape/blah.chat/commit/d553f5517198f6c97fef6e747ca14bfee5babe1b))
* **mobile:** polyfill navigator.onLine for Clerk init + restore resourceCache ([eebde4d](https://github.com/planetaryescape/blah.chat/commit/eebde4dbf1776f4376c378b7dcba904def1c451a))
* **mobile:** redesign auth screens + fix sign-in not working ([9005ae7](https://github.com/planetaryescape/blah.chat/commit/9005ae75aff2f167c9eb689a1f2e3d2d9743e028))
* **mobile:** regenerate bun.lock for EAS frozen lockfile ([8047960](https://github.com/planetaryescape/blah.chat/commit/80479609f0c6b218fd4697953a382b7a65b0d4d5))
* **mobile:** remove _generated imports to pass portable check ([b81cb1e](https://github.com/planetaryescape/blah.chat/commit/b81cb1e24e494320e6187eadd9a0385b8e25c9b0))
* **mobile:** remove console.error in favor of graceful handling ([ab4ef47](https://github.com/planetaryescape/blah.chat/commit/ab4ef477696db0c15d3c6633e10121faa31ebf80))
* **mobile:** remove dead (app) route group and fix auth redirect ([05d7868](https://github.com/planetaryescape/blah.chat/commit/05d7868f1e8481e8b440f36e44368e705181bc3d))
* **mobile:** remove unused variables in mathProcessor ([a4f92e5](https://github.com/planetaryescape/blah.chat/commit/a4f92e5c1d8a87d46835c9e08bc590e9acd67b2a))
* **mobile:** replace broken syntax highlighter with native code display ([bc1ea5e](https://github.com/planetaryescape/blah.chat/commit/bc1ea5edbc16b4dc6a82b6ae68dfcef5201e0564))
* **mobile:** resolve bugs in chat rendering and animations ([b8f0fe5](https://github.com/planetaryescape/blah.chat/commit/b8f0fe5deb23b8dc390ccdb968317534f96f6fe2))
* **mobile:** resolve Clerk isLoaded hang on TestFlight ([30c6d28](https://github.com/planetaryescape/blah.chat/commit/30c6d28089bce259246cd2d306069d8b181be5d2))
* **mobile:** resolve React version mismatch and remove Moti ([fff65a8](https://github.com/planetaryescape/blah.chat/commit/fff65a8c5d66950b6417663f916e063aeb6aa6e7))
* **mobile:** resolve TestFlight login connection failure ([#348](https://github.com/planetaryescape/blah.chat/issues/348)) ([9d5290a](https://github.com/planetaryescape/blah.chat/commit/9d5290ac07e4aa44f1b2b0eaf45ea14672899d39))
* **mobile:** revert typed Convex API to fix React version mismatch ([02da6ca](https://github.com/planetaryescape/blah.chat/commit/02da6ca02ac4baa3886107eb0db5bc0105407dc8))
* **mobile:** safely handle WebView native module in Expo Go ([2db784d](https://github.com/planetaryescape/blah.chat/commit/2db784da30a301795626b1c422da8db71b13de12))
* **mobile:** save as note sheet not opening ([8315588](https://github.com/planetaryescape/blah.chat/commit/83155887010d7b8bd450ddb79613749c2829d0bf))
* **mobile:** sync bun version to 1.3.5 across all configs ([2c55cd1](https://github.com/planetaryescape/blah.chat/commit/2c55cd1165a9bf1f9c559f3f60a898a5285db19a))
* **mobile:** transpile bible-passage-reference-parser private class fields ([c85efc3](https://github.com/planetaryescape/blah.chat/commit/c85efc397b1597efe4cd41b255b7ec2b7831bc5e))
* **mobile:** use glass-style user bubble matching web ([f6c47e4](https://github.com/planetaryescape/blah.chat/commit/f6c47e46c135c92c7bf516e27908200ba2cd2f4c))
* **mobile:** use inline hljs style for syntax highlighter ([f484f5d](https://github.com/planetaryescape/blah.chat/commit/f484f5d61121187a03274bd331bc41affbd617c3))
* **mobile:** use primary color for all links in markdown ([31a8413](https://github.com/planetaryescape/blah.chat/commit/31a8413184f8399fa67e127dd7b4ef2b15dbc0d7))
* **mobile:** use require() for bible-passage-reference-parser ([c746f34](https://github.com/planetaryescape/blah.chat/commit/c746f34818c96dc0e953edbdf3b49c72262d40cb))
* **mobile:** use RNGH TouchableOpacity for drawer gesture compatibility ([1e028e8](https://github.com/planetaryescape/blah.chat/commit/1e028e8aaa651ebc933778563d408650dede7ce1))
* **models:** cascade delete profiles and safe JSON parsing ([b6b5c4d](https://github.com/planetaryescape/blah.chat/commit/b6b5c4d313ec7bf27c4a7f86db200c76067ccdd8))
* **models:** fallback to static config when DB is empty ([ae36f2a](https://github.com/planetaryescape/blah.chat/commit/ae36f2ab44bdb0c76cae44681c09fd9d91918202))
* **models:** run convex CLI from backend directory ([4385e10](https://github.com/planetaryescape/blah.chat/commit/4385e10df1aeb889fd5ec629c9392d33d040936e))
* normalize tool names to satisfy provider limits ([867257e](https://github.com/planetaryescape/blah.chat/commit/867257e644563b51ffd8ae0d1994d37f48420900))
* preserve mobile chat input caret focus ([7b76569](https://github.com/planetaryescape/blah.chat/commit/7b76569e287ea4d45e88fa526f99436e2c84f9b2))
* prevent stale autorelease pending labels ([180583b](https://github.com/planetaryescape/blah.chat/commit/180583b6b087d21bd15b4726b88ad05de5df94de))
* publish desktop releases with DMG (immutable releases) ([#304](https://github.com/planetaryescape/blah.chat/issues/304)) ([85a3a6c](https://github.com/planetaryescape/blah.chat/commit/85a3a6c5d990d755d9442197110fbe89c473ebe3))
* quote run cmd with colon ([e962077](https://github.com/planetaryescape/blah.chat/commit/e962077842bfd4089675dd2ed64eee2b511a19cd))
* raycast ci filter ([2376e8c](https://github.com/planetaryescape/blah.chat/commit/2376e8cb9061faa118cdded97e1a82982d0cf1ce))
* raycast ci install ([0ee90a9](https://github.com/planetaryescape/blah.chat/commit/0ee90a979f8a924377f4c36e64c7ae08f3779471))
* **raycast:** relax lint for bun-only workspace ([1f50881](https://github.com/planetaryescape/blah.chat/commit/1f5088133d507159514cc83fbb67f98e570b9d05))
* remove invalid install config from eas.json ([16a21e2](https://github.com/planetaryescape/blah.chat/commit/16a21e2cb04ef03888721d97ce1346a8d7c6d78c))
* remove unused Buffer import and mapping ([af0c0de](https://github.com/planetaryescape/blah.chat/commit/af0c0def19d5bc83cb06390f2dcd3122b3cf5edc))
* repair dependabot merge automation ([b1e1ee6](https://github.com/planetaryescape/blah.chat/commit/b1e1ee6542c9e509a49baa5be5c82403fafee812))
* require Developer ID cert for desktop release ([08877a8](https://github.com/planetaryescape/blah.chat/commit/08877a81c8adc1e892c4177978a0372174502b95))
* resolve codacy issues in message tree ordering ([914dc82](https://github.com/planetaryescape/blah.chat/commit/914dc8287a3d30186b6765c0d1e6d746c7242599))
* **router:** improve high-stakes topic detection for medical advice ([2627316](https://github.com/planetaryescape/blah.chat/commit/262731686a785ea3df1e1b6c3b1aa0a6a1813acc))
* **security:** add admin authorization to admin-only model queries ([547113c](https://github.com/planetaryescape/blah.chat/commit/547113c6931668b44b2af8e2a75a627e5687cfb5))
* **security:** add input validation for model IDs ([e3eb676](https://github.com/planetaryescape/blah.chat/commit/e3eb676ac3cd851ab05ad056af4a9c0f9d9d0054))
* **security:** address critical OAuth vulnerabilities ([a7d6485](https://github.com/planetaryescape/blah.chat/commit/a7d648540f6493c2632fd481fc422ba079c061d5))
* **security:** hardcode production domain for postMessage origin ([0c32693](https://github.com/planetaryescape/blah.chat/commit/0c326930414dff497bc81eed2f71902c6f43ee2c))
* **security:** move DOMPurify sanitization to main thread ([01d5dca](https://github.com/planetaryescape/blah.chat/commit/01d5dca2071f57eee36518262915bdbda7e5e9bc))
* **security:** strengthen CSRF and XSS protections ([f726e26](https://github.com/planetaryescape/blah.chat/commit/f726e26a7856685fcddd23700ceb19b8556d6e99))
* **settings:** sticky tabs and pending connection UX ([0029987](https://github.com/planetaryescape/blah.chat/commit/00299871805b67b46970b49d6f578d3d1ef7ef7d))
* **shares:** show expired state instead of not found for expired shares ([96c8c89](https://github.com/planetaryescape/blah.chat/commit/96c8c89e4054744861123d647c6a42c25e0cea2f))
* skip desktop build on non-mac CI hosts ([60fe91e](https://github.com/planetaryescape/blah.chat/commit/60fe91e009ce38e39717c0ac0cfab2d89f6800a7))
* stabilize desktop build and updater defaults ([00f91cf](https://github.com/planetaryescape/blah.chat/commit/00f91cf01701a6a78ebbed1daf65f3b0aff2c097))
* stabilize iOS mobile chat input focus ([4e920ab](https://github.com/planetaryescape/blah.chat/commit/4e920ab9a5565a0c4b4d7fe73a5818b1e5c7f2dd))
* sync byod schema and make classifier fields migration-safe ([016c066](https://github.com/planetaryescape/blah.chat/commit/016c066deb9fb308cb705d6292f3a374a2a2f1fd))
* **test:** add missing get/put mocks to userPreferences cache ([7cbea3f](https://github.com/planetaryescape/blah.chat/commit/7cbea3ff1bbab9c79948d64e8ef98bb15b4b8eae))
* **test:** mock useSidebar in ConversationItem tests ([8473ae0](https://github.com/planetaryescape/blah.chat/commit/8473ae0399809bd6b9d1ce544c1a08a06bdaaddc))
* **tree:** ensure deactivateSubtree patches undefined isActiveBranch values ([9fc88f5](https://github.com/planetaryescape/blah.chat/commit/9fc88f5eab1b93156294a1cefd68b6fdc5830cdc))
* **tree:** prevent duplicate IDs in BFS traversal for DAG with multi-parent nodes ([9fecdcc](https://github.com/planetaryescape/blah.chat/commit/9fecdcc8a8799620cb1b6c02f1c0aa236e75060e))
* **ui:** improve tool call display and integrations list ([37fc858](https://github.com/planetaryescape/blah.chat/commit/37fc8581591e7e55b24a1b4bfa53013a2e726324))
* **ui:** prevent iOS Safari auto-zoom on input focus ([601fe49](https://github.com/planetaryescape/blah.chat/commit/601fe494c3086fed07cf119f8408fd4e85f59f50))
* unblock CI convex dry run + sdk build ([db0fc2a](https://github.com/planetaryescape/blah.chat/commit/db0fc2ad2cf648f16c447940668d820198341636))
* use backend deploy script for production convex deploy ([#386](https://github.com/planetaryescape/blah.chat/issues/386)) ([f904d61](https://github.com/planetaryescape/blah.chat/commit/f904d6103e17a9775607e62fc77663f267d212f8))
* use backend deploy script in production workflow ([f904d61](https://github.com/planetaryescape/blah.chat/commit/f904d6103e17a9775607e62fc77663f267d212f8))
* use legacy bible parser bundle in mobile build ([39a5acd](https://github.com/planetaryescape/blah.chat/commit/39a5acdffdce07439babdbdf38b8a1cc978b421d))
* validate fallback model and sync pre-created message model ([3692f65](https://github.com/planetaryescape/blah.chat/commit/3692f65e4b590118d993b2cf403fd814df0b542e))
* verify notarized dmg with open assessment ([3566c81](https://github.com/planetaryescape/blah.chat/commit/3566c811b8acfe9a9f804505efb8beb24824171c))
* verify notarized dmg with proper spctl mode ([#381](https://github.com/planetaryescape/blah.chat/issues/381)) ([3566c81](https://github.com/planetaryescape/blah.chat/commit/3566c811b8acfe9a9f804505efb8beb24824171c))
* **web:** escape &gt; characters in JSX DialogDescription ([fee5383](https://github.com/planetaryescape/blah.chat/commit/fee5383da3fe9b9fcb37ff671e42eff4a4577c8b))
* **web:** increase assistant message font weight to medium ([84b780c](https://github.com/planetaryescape/blah.chat/commit/84b780cb9ce98adc26cf8210011b5c658715139e))
* **web:** synthesize desktop updater manifest from release artifacts ([c4f5d15](https://github.com/planetaryescape/blah.chat/commit/c4f5d1530fc835b94349d574cd1c529702332dbb))
* wrap streamText in try/catch, reset haptic ref on conversation change ([44e8321](https://github.com/planetaryescape/blah.chat/commit/44e8321e074bae932395cc2821fb21620217434d))


### Performance Improvements

* extract sortedCalls to separate useMemo in InlineToolCallContent ([4e41ecb](https://github.com/planetaryescape/blah.chat/commit/4e41ecb911924b3d70f2b139794de37c1f68c41c))
* **mobile:** optimize chat rendering and message deduplication ([520b99b](https://github.com/planetaryescape/blah.chat/commit/520b99b13aa0f9230de58777661758017d010001))

## [1.29.0](https://github.com/planetaryescape/blah.chat/compare/v1.28.0...v1.29.0) (2026-02-28)


### Features

* **desktop:** add update check and one-click install flow ([28d0842](https://github.com/planetaryescape/blah.chat/commit/28d0842935d344eaef93e957f3fd3da7cbac113d))
* **web:** add desktop updater manifest endpoint ([7f5fe3c](https://github.com/planetaryescape/blah.chat/commit/7f5fe3ccfe09dac62ed8ee03f854eb5f77b1db6c))


### Bug Fixes

* **ci:** repair desktop notarization parsing scripts ([aa58459](https://github.com/planetaryescape/blah.chat/commit/aa58459fa60fff1cf643dd02fd506ed06013c321))
* **ci:** restore valid desktop release workflow yaml ([6f6ca79](https://github.com/planetaryescape/blah.chat/commit/6f6ca79dc682765b8ef7db08c9c1f2b7afcbda9d))

## [1.28.0](https://github.com/planetaryescape/blah.chat/compare/v1.27.3...v1.28.0) (2026-02-26)


### Features

* **admin:** add last-active tracking and daily activity log ([02a530f](https://github.com/planetaryescape/blah.chat/commit/02a530f6c985da2e5622dca82c6657b352d29733))
* **admin:** add router mode selector and classifier settings to dashboard ([668b15e](https://github.com/planetaryescape/blah.chat/commit/668b15e573f8bea0dd59e7ff0ea4b30a2c34c483))
* **auto-router:** add classifier-based model router ([a72cf45](https://github.com/planetaryescape/blah.chat/commit/a72cf454ef0af9f149588a19f9219d816026cbc8))
* **auto-router:** add EmbeddingProvider, ModelRegistry, and Router factory ([8273263](https://github.com/planetaryescape/blah.chat/commit/8273263e7e175dc2a8509134acbef8f936b7b69a))
* refresh app icons and opengraph assets ([84afc03](https://github.com/planetaryescape/blah.chat/commit/84afc03fb50dbae9529c3948bd1f3d8d688051c9))


### Bug Fixes

* address code review feedback and CI failures ([bc56b4f](https://github.com/planetaryescape/blah.chat/commit/bc56b4f9acafdd878ba7b3ed94e0275d689261e1))
* make chat timeline tree-aware and deterministic ([0468503](https://github.com/planetaryescape/blah.chat/commit/046850323d729f790574707bf1f1a581eedd6232))
* **mobile:** handle email verification step during sign-in ([a30ccf4](https://github.com/planetaryescape/blah.chat/commit/a30ccf46791bd41c3c33835a2ef1c7f2d0d8b27a))
* **mobile:** polyfill navigator.onLine for Clerk init + restore resourceCache ([eebde4d](https://github.com/planetaryescape/blah.chat/commit/eebde4dbf1776f4376c378b7dcba904def1c451a))
* **mobile:** redesign auth screens + fix sign-in not working ([9005ae7](https://github.com/planetaryescape/blah.chat/commit/9005ae75aff2f167c9eb689a1f2e3d2d9743e028))
* resolve codacy issues in message tree ordering ([914dc82](https://github.com/planetaryescape/blah.chat/commit/914dc8287a3d30186b6765c0d1e6d746c7242599))
* sync byod schema and make classifier fields migration-safe ([016c066](https://github.com/planetaryescape/blah.chat/commit/016c066deb9fb308cb705d6292f3a374a2a2f1fd))

## [1.27.3](https://github.com/planetaryescape/blah.chat/compare/v1.27.2...v1.27.3) (2026-02-23)


### Bug Fixes

* **mobile:** resolve Clerk isLoaded hang on TestFlight ([30c6d28](https://github.com/planetaryescape/blah.chat/commit/30c6d28089bce259246cd2d306069d8b181be5d2))

## [1.27.2](https://github.com/planetaryescape/blah.chat/compare/v1.27.1...v1.27.2) (2026-02-23)


### Bug Fixes

* **mobile:** add diagnostic overlay for TestFlight connection failure ([208f1f4](https://github.com/planetaryescape/blah.chat/commit/208f1f4af085d217631bd5b9a4311fe9697c6e84))

## [1.27.1](https://github.com/planetaryescape/blah.chat/compare/v1.27.0...v1.27.1) (2026-02-23)


### Bug Fixes

* **mobile:** resolve TestFlight login connection failure ([#348](https://github.com/planetaryescape/blah.chat/issues/348)) ([9d5290a](https://github.com/planetaryescape/blah.chat/commit/9d5290ac07e4aa44f1b2b0eaf45ea14672899d39))

## [1.27.0](https://github.com/planetaryescape/blah.chat/compare/v1.26.1...v1.27.0) (2026-02-20)


### Features

* **mobile:** add design system tokens and migrate hardcoded values ([04f0c79](https://github.com/planetaryescape/blah.chat/commit/04f0c7996f7a272e2625a9dfb5131d16d9483a16))
* **mobile:** add settings screen with full preference management ([f1cd204](https://github.com/planetaryescape/blah.chat/commit/f1cd204b58163d36d962e239e486e7ff0fb29832))
* **mobile:** add typed Convex API, ErrorBoundary, and accessibility ([e6c8e6c](https://github.com/planetaryescape/blah.chat/commit/e6c8e6cc01c89300e0d5ee09a3906b4a445123f8))
* **mobile:** increase chat input max expand height to 200px ([da98a45](https://github.com/planetaryescape/blah.chat/commit/da98a4577ff23a138aef445e0f0d8d209a5f815c))


### Bug Fixes

* **ci:** restore valid incognito stale query ([d84d021](https://github.com/planetaryescape/blah.chat/commit/d84d0212b191209d89728526249b43fe00da0468))
* **ci:** sync lockfile and unblock checks ([36b09f0](https://github.com/planetaryescape/blah.chat/commit/36b09f0b941aa0380ae9a359c93704f95593e3e6))
* dependabot auto-merge workflow chain ([c9d45ad](https://github.com/planetaryescape/blah.chat/commit/c9d45adc6121fe3aae1a297fc2a0c01b0f82d17c))
* **mobile,web:** new chat button + sidebar auto-close + SSR header visibility ([6a3cd92](https://github.com/planetaryescape/blah.chat/commit/6a3cd92176686dbb363df569ab9a548727c1bbaa))
* **mobile:** audit phase A/B — parser fix, design system, typed API ([2a63d6b](https://github.com/planetaryescape/blah.chat/commit/2a63d6b0d49cacdda14a68970c492108e3a32d4d))
* **mobile:** fix refractor crash by shimming it out in Metro ([b55825b](https://github.com/planetaryescape/blah.chat/commit/b55825bebfa69d8e21d3892421c34fa20f3d3d55))
* **mobile:** keep bun lockfile for EAS ([ed55fcd](https://github.com/planetaryescape/blah.chat/commit/ed55fcdd7e8a54a9907115bcced295f44f4afcc1))
* **mobile:** pin react to 19.1.0 to match react-native 0.81.5 ([d553f55](https://github.com/planetaryescape/blah.chat/commit/d553f5517198f6c97fef6e747ca14bfee5babe1b))
* **mobile:** remove _generated imports to pass portable check ([b81cb1e](https://github.com/planetaryescape/blah.chat/commit/b81cb1e24e494320e6187eadd9a0385b8e25c9b0))
* **mobile:** remove dead (app) route group and fix auth redirect ([05d7868](https://github.com/planetaryescape/blah.chat/commit/05d7868f1e8481e8b440f36e44368e705181bc3d))
* **mobile:** resolve bugs in chat rendering and animations ([b8f0fe5](https://github.com/planetaryescape/blah.chat/commit/b8f0fe5deb23b8dc390ccdb968317534f96f6fe2))
* **mobile:** revert typed Convex API to fix React version mismatch ([02da6ca](https://github.com/planetaryescape/blah.chat/commit/02da6ca02ac4baa3886107eb0db5bc0105407dc8))
* **mobile:** use require() for bible-passage-reference-parser ([c746f34](https://github.com/planetaryescape/blah.chat/commit/c746f34818c96dc0e953edbdf3b49c72262d40cb))
* **test:** mock useSidebar in ConversationItem tests ([8473ae0](https://github.com/planetaryescape/blah.chat/commit/8473ae0399809bd6b9d1ce544c1a08a06bdaaddc))

## [1.26.1](https://github.com/planetaryescape/blah.chat/compare/v1.26.0...v1.26.1) (2026-02-11)


### Bug Fixes

* **ci:** stop actions approving PRs ([947f6fd](https://github.com/planetaryescape/blah.chat/commit/947f6fdf7de012b684b3497d99367394b34cd910))
* **ci:** use MERGE_BOT_TOKEN for automerge approvals ([082f5cd](https://github.com/planetaryescape/blah.chat/commit/082f5cd7aafce156aa328a36f5733404201e4896))

## [1.26.0](https://github.com/planetaryescape/blah.chat/compare/v1.25.0...v1.26.0) (2026-02-11)


### Features

* **cognitive-memory:** access frequency reinforcement ([5f2d737](https://github.com/planetaryescape/blah.chat/commit/5f2d737249eabcd5b490f9fb4bf0aa5f46e23041))
* **cognitive-memory:** add postgres and jsonl adapters ([1d1475a](https://github.com/planetaryescape/blah.chat/commit/1d1475ab1ea2015ca47dc1cd9d3ede53cd3cd2b7))


### Bug Fixes

* **cognitive-memory:** jsonl rollover preserves history ([2d7a34b](https://github.com/planetaryescape/blah.chat/commit/2d7a34b5a97955720cbb6e3f8a3e214a5bcae87d))
* **cognitive-memory:** postgres linked memories bidirectional ([220005d](https://github.com/planetaryescape/blah.chat/commit/220005d43e35b889ce49990953ac918c91c7bd51))
* quote run cmd with colon ([e962077](https://github.com/planetaryescape/blah.chat/commit/e962077842bfd4089675dd2ed64eee2b511a19cd))

## [1.25.0](https://github.com/planetaryescape/blah.chat/compare/v1.24.1...v1.25.0) (2026-02-10)


### Features

* cognitive memory v1 ([21e8bb7](https://github.com/planetaryescape/blah.chat/commit/21e8bb7b4026a5975b02209a8b9d0f1b0eb0be62))


### Bug Fixes

* raycast ci filter ([2376e8c](https://github.com/planetaryescape/blah.chat/commit/2376e8cb9061faa118cdded97e1a82982d0cf1ce))
* raycast ci install ([0ee90a9](https://github.com/planetaryescape/blah.chat/commit/0ee90a979f8a924377f4c36e64c7ae08f3779471))

## [1.24.1](https://github.com/planetaryescape/blah.chat/compare/v1.24.0...v1.24.1) (2026-02-09)


### Bug Fixes

* mobile new chat access ([98f0012](https://github.com/planetaryescape/blah.chat/commit/98f0012af9489acefc9c37a8fbb7315459553e4d))
* unblock CI convex dry run + sdk build ([db0fc2a](https://github.com/planetaryescape/blah.chat/commit/db0fc2ad2cf648f16c447940668d820198341636))

## [1.24.0](https://github.com/planetaryescape/blah.chat/compare/v1.23.0...v1.24.0) (2026-02-09)


### Features

* desktop companion controls ([503fe2e](https://github.com/planetaryescape/blah.chat/commit/503fe2e9aea9ad48b9d1f948914470113df77b00))


### Bug Fixes

* async desktop notarization finalize ([#307](https://github.com/planetaryescape/blah.chat/issues/307)) ([2889a04](https://github.com/planetaryescape/blah.chat/commit/2889a042ce91a5071988e1404b0dff492df2d84f))
* async desktop notarization without wait ([2889a04](https://github.com/planetaryescape/blah.chat/commit/2889a042ce91a5071988e1404b0dff492df2d84f))
* avoid waiting for desktop notarization ([6a8841d](https://github.com/planetaryescape/blah.chat/commit/6a8841d2a8534c85923c15866283e6b2418494ac))
* publish desktop releases with DMG (immutable releases) ([#304](https://github.com/planetaryescape/blah.chat/issues/304)) ([85a3a6c](https://github.com/planetaryescape/blah.chat/commit/85a3a6c5d990d755d9442197110fbe89c473ebe3))

## [1.23.0](https://github.com/planetaryescape/blah.chat/compare/v1.22.4...v1.23.0) (2026-02-08)


### Features

* **a11y:** add accessibility analytics events ([ff5eba7](https://github.com/planetaryescape/blah.chat/commit/ff5eba776c35e9abda389d64adcb226bdbcf38ac))
* **a11y:** add accessibility preference schema and defaults ([312a01a](https://github.com/planetaryescape/blah.chat/commit/312a01ada6814011d05dece761975e704fb42b03))
* **a11y:** add accessibility settings UI ([cb2da93](https://github.com/planetaryescape/blah.chat/commit/cb2da93e34cae633a7fe65ff8f5f08bd062fbec0))
* **a11y:** add hook to apply accessibility classes to DOM ([2b7d7a2](https://github.com/planetaryescape/blah.chat/commit/2b7d7a2d489cb4b975b1c64eb7188cbc87fa1d1d))
* **a11y:** add keyboard navigation with vim-style shortcuts ([c785ec2](https://github.com/planetaryescape/blah.chat/commit/c785ec237c2bb35a1448fd11bf248638e7b76787))
* **a11y:** add MotionProvider for reduced motion support ([39233c1](https://github.com/planetaryescape/blah.chat/commit/39233c1b3b6cf86a1540edb2e02f5f3ddee97049))
* **a11y:** add semantic HTML accessibility improvements ([a4209a6](https://github.com/planetaryescape/blah.chat/commit/a4209a6ca687b3296bbdd78a0e59e368ad8f5214))
* **a11y:** add WCAG-compliant CSS for high contrast and text scaling ([ac9c0f7](https://github.com/planetaryescape/blah.chat/commit/ac9c0f73008980984f366c4c21ed1e0bf3e42359))
* **a11y:** bypass stream buffering when reduced motion preferred ([c865412](https://github.com/planetaryescape/blah.chat/commit/c8654120869fe4f7e77711e6dcae590a8c41116c))
* **a11y:** implement focus management for WCAG 2.4.3/2.4.7 compliance ([274a3e4](https://github.com/planetaryescape/blah.chat/commit/274a3e46be9169292d0d479c59ce2c15d21cd57e))
* add auto router enabled setting with analytics ([efaad60](https://github.com/planetaryescape/blah.chat/commit/efaad60bfa4255f3d41d6b6c97d0c687041ffcc0))
* add desktop app shell and automated release pipeline ([6dddde1](https://github.com/planetaryescape/blah.chat/commit/6dddde1e62a3d520e3d3e4a856f88e10ff74fe4c))
* **admin:** add models and auto-router admin UI ([2b90b8b](https://github.com/planetaryescape/blah.chat/commit/2b90b8b26409549e04976b0e47ef63bbc749526e))
* **admin:** display error context in feedback detail ([ac4b575](https://github.com/planetaryescape/blah.chat/commit/ac4b5758c7736c996ba1648c42791fd09aec3865))
* **admin:** make max active integrations configurable ([7d003c2](https://github.com/planetaryescape/blah.chat/commit/7d003c2da5133ef8749f6f7818ef66a28a74537b))
* **admin:** replace router model select with combobox ([d47e43f](https://github.com/planetaryescape/blah.chat/commit/d47e43f568ff81aedb222181bb9df9ed07ff2cd4))
* **admin:** use select dropdown for router model setting ([da87bdf](https://github.com/planetaryescape/blah.chat/commit/da87bdf14656c1c88a2473f0674be95b14604ccb))
* **ai:** add currency converter tool ([d34f493](https://github.com/planetaryescape/blah.chat/commit/d34f4933465c0e731ba3a250ac59b40c7fec8acd))
* **api:** harden authz and portable SSE ([3467a01](https://github.com/planetaryescape/blah.chat/commit/3467a014321477240fa8884a25959f6b1b4ecfe1))
* **auto-router:** add high-stakes topic detection ([111c339](https://github.com/planetaryescape/blah.chat/commit/111c339175fe8262fb071cbc5ad7f9d5fe0ed1e2))
* **auto-router:** add sticky routing fields to classification schema ([c8dc591](https://github.com/planetaryescape/blah.chat/commit/c8dc591774a745b42b3d1c6604df45eef3a9f0d4))
* **auto-router:** build dynamic classification prompt with previous model context ([73df0a7](https://github.com/planetaryescape/blah.chat/commit/73df0a7078ddda5a3cbb188ff237f7c47b679481))
* **auto-router:** implement sticky routing with early exit ([0539dba](https://github.com/planetaryescape/blah.chat/commit/0539dbad94a41e72c4e4b712c46dc8c920060d23))
* **backend:** add admin alerting for generation failures ([44ceaeb](https://github.com/planetaryescape/blah.chat/commit/44ceaeb420a1e5e992480b5ba528e78269a31d72))
* **backend:** add auto-router error recovery with retry logic ([f0513f0](https://github.com/planetaryescape/blah.chat/commit/f0513f0cfe69cd61ede73af146d563c6bd7487d4))
* **backend:** add enableModelRecommendations user preference ([5397ac5](https://github.com/planetaryescape/blah.chat/commit/5397ac55e7ccdb535ebfaf0bb5ed89b143a4edf4))
* **backend:** add hapticFeedbackEnabled preference ([1b3c7eb](https://github.com/planetaryescape/blah.chat/commit/1b3c7ebc19f81fb3f015f22d5cc8f52b80b2cde3))
* **backend:** add tree architecture migration script ([2acc8be](https://github.com/planetaryescape/blah.chat/commit/2acc8be6c8cb1e24f42d1217ef74debf6d1f5094))
* **backend:** add tree queries and update message creation for P7 ([8029d5a](https://github.com/planetaryescape/blah.chat/commit/8029d5a15e8701689e1514ad46fc934e603d45c6))
* **backend:** add tree traversal utilities for message architecture ([7974fe2](https://github.com/planetaryescape/blah.chat/commit/7974fe2a46b6e05446d84fc925c61a3ce08c3941))
* **backend:** filter messages by active branch in getConversationMessages ([5f5b74f](https://github.com/planetaryescape/blah.chat/commit/5f5b74f795e5c73911c0098fa01bdb603f457763))
* **backend:** update chat mutations for tree-based branching (P7) ([49d4f53](https://github.com/planetaryescape/blah.chat/commit/49d4f53bf0de626a2007dc6a3cceb7f7aeebc97c))
* **cache:** update Dexie schema v5 for tree architecture ([7b9135c](https://github.com/planetaryescape/blah.chat/commit/7b9135c079596d56bc6e76308bf6733db099081b))
* **chat:** add lock check and acquisition in sendMessage ([0da521a](https://github.com/planetaryescape/blah.chat/commit/0da521a84edbc83671bb9a8dadefdbaa544eae15))
* **chat:** add Safari fallback for scroll anchoring ([228fcac](https://github.com/planetaryescape/blah.chat/commit/228fcac6b3a2e309c10c06e856b59f599d84891d))
* **chat:** add StatusTimeline for tool execution progress ([8942cda](https://github.com/planetaryescape/blah.chat/commit/8942cda16be03e09a127c6dd69c61b0cf6ae449f))
* **chat:** add useHoverIntent hook for delayed hover states ([cce0e03](https://github.com/planetaryescape/blah.chat/commit/cce0e0395098bb659aa2d47dd118a15088369f62))
* **chat:** add web worker for markdown parsing ([cb8862d](https://github.com/planetaryescape/blah.chat/commit/cb8862d2084996c2f397c9fc31ea7f24199cd72d))
* **chat:** apply hover delay to message action menus ([fb0645a](https://github.com/planetaryescape/blah.chat/commit/fb0645a68bd3e679b5be13d821ca62ffa2070735))
* **chat:** display sticky routing indicator in message stats ([6409bbb](https://github.com/planetaryescape/blah.chat/commit/6409bbbd08510c5ac5d2158032e0fe816ffabd6a))
* **chat:** enhance typing indicator with model name ([f08700a](https://github.com/planetaryescape/blah.chat/commit/f08700afe53a1c45d4f22353e1446e5090c7b266))
* **chat:** integrate haptic feedback on send, copy, stop, delete ([f5c7dac](https://github.com/planetaryescape/blah.chat/commit/f5c7daccbcce7bb35fca8c7d7c0e6623d82f41c9))
* **chat:** integrate StatusTimeline in AI messages ([735db13](https://github.com/planetaryescape/blah.chat/commit/735db13455163c0312e5d8f11e7621509e6fe6cf))
* **ci:** migrate to tag-based deployments with release-please ([b2a78cf](https://github.com/planetaryescape/blah.chat/commit/b2a78cf0ac3d65bd9796dbe44456301833e23b9e))
* **cli:** add debug command and fix search query param ([d270926](https://github.com/planetaryescape/blah.chat/commit/d2709268110dac3475c2dc5f06783a56f9a1f029))
* **cli:** add multi-platform distribution support ([98feff1](https://github.com/planetaryescape/blah.chat/commit/98feff15dfb5da02146f89bd1e47e71ea6019935))
* **cli:** add release workflow and compile script ([85e1f09](https://github.com/planetaryescape/blah.chat/commit/85e1f09ace8a72d74eb66d0de9181ace3c72c650))
* **cli:** add tree-sitter syntax highlighting support ([e4bc651](https://github.com/planetaryescape/blah.chat/commit/e4bc651c1b7c43c4798151c3db343fbe68cc112d))
* **clients:** migrate clients to SDK transport ([864908c](https://github.com/planetaryescape/blah.chat/commit/864908c29f8957c854c28b0e98f7b5771164bd66))
* **cli:** improve components for OpenTUI rewrite ([14f5f03](https://github.com/planetaryescape/blah.chat/commit/14f5f035a0b19e698ad3daf9a0297da401cee688))
* **composio:** add integrations indicator in chat input ([ebea740](https://github.com/planetaryescape/blah.chat/commit/ebea740883571291ec217ab388ea85b5fd085953))
* **composio:** add svgl icons and improve settings UI ([0cf2bb5](https://github.com/planetaryescape/blah.chat/commit/0cf2bb571c2e9b6591f93a6d8c8ebf4d774aef3f))
* **composio:** curate integrations to 50 high-value services ([2abf0e2](https://github.com/planetaryescape/blah.chat/commit/2abf0e229e8d75a5c5d55e16ebeefef1d963a780))
* **composio:** improve tools integration and logging ([0778292](https://github.com/planetaryescape/blah.chat/commit/0778292e3b5eb57d607a1e47f1be4a8b1c0cb3de))
* **composio:** restore 500+ integrations after OAuth fix ([196ceaa](https://github.com/planetaryescape/blah.chat/commit/196ceaadc8479fa45ec7a56d2f257d45872d5dc3))
* **generation:** add generation lock utility module ([6ac8596](https://github.com/planetaryescape/blah.chat/commit/6ac8596da6375f91e6910dc48c30644acbda17e2))
* **generation:** propagate isSticky field through generation pipeline ([669374a](https://github.com/planetaryescape/blah.chat/commit/669374a596fb5285dc97d5fadca8f7d7279e5d0f))
* **generation:** release lock on completion, stop, and error ([dec7d0a](https://github.com/planetaryescape/blah.chat/commit/dec7d0a2a31070bc3a4bf1d261be30d9b7cff2b4))
* **hooks:** add tree data cache sync hooks ([7a1fb0f](https://github.com/planetaryescape/blah.chat/commit/7a1fb0f244bc3c93c6efaffa3b68680a9ef92c0b))
* **hooks:** add useBranchComparison hook for branch state management ([4fa2588](https://github.com/planetaryescape/blah.chat/commit/4fa25881e5e4db38ba9473f28f39e9127536cb68))
* **hooks:** add useHaptic hook ([d8bc365](https://github.com/planetaryescape/blah.chat/commit/d8bc3655e440b176f251570893b60a9380585354))
* **input:** auto-convert large pastes to file attachments ([75a6173](https://github.com/planetaryescape/blah.chat/commit/75a617304e4c2430d92ca5f7198d32f3fbe21532))
* **integrations:** add Composio integration for external service tools ([208d28c](https://github.com/planetaryescape/blah.chat/commit/208d28ca5d4ef45dc123036ae3dfc418b3b436b2))
* **lib:** add haptic feedback utility ([30484f1](https://github.com/planetaryescape/blah.chat/commit/30484f107d8ffca270c83ea389d1dffd0ea23041))
* **mobile:** add Android project scaffolding ([f5b31e5](https://github.com/planetaryescape/blah.chat/commit/f5b31e5e402156df73014d73335f59a7d2405f5f))
* **mobile:** add bookmark and save-as-note actions to messages ([5ddeedd](https://github.com/planetaryescape/blah.chat/commit/5ddeeddcc168f5f37851d03dfd207bdaacd33c9d))
* **mobile:** add branch navigation UI components ([9513d7e](https://github.com/planetaryescape/blah.chat/commit/9513d7eded13c1c904b93660da8fb7676c238423))
* **mobile:** add drawer navigation with conversation search and project filtering ([748ede0](https://github.com/planetaryescape/blah.chat/commit/748ede0bd3ce3b7e7558502078db04c6fd1a1e79))
* **mobile:** add hooks for bookmarks and notes ([8601c0e](https://github.com/planetaryescape/blah.chat/commit/8601c0eb6e309bd86acf61cc12a317753233410c))
* **mobile:** add hooks for sibling navigation and message actions ([67cd5d9](https://github.com/planetaryescape/blah.chat/commit/67cd5d9c11ea918c8efad69747af0ec14dd4d36f))
* **mobile:** add notes navigation to drawer ([3a90e2b](https://github.com/planetaryescape/blah.chat/commit/3a90e2b81e46bd2e01e70db0cb05ee48fd95d697))
* **mobile:** add notes screens with auto-tag and sharing ([f1b0ba7](https://github.com/planetaryescape/blah.chat/commit/f1b0ba78f1c98e7f517e1698b960465bf17ef377))
* **mobile:** add notes UI components ([abeca6d](https://github.com/planetaryescape/blah.chat/commit/abeca6df76ad12ef28ed2433f9c1f4bba4241071))
* **mobile:** add rich content rendering to chat messages ([437b03b](https://github.com/planetaryescape/blah.chat/commit/437b03b4d4e994a0a3a475a52c313700be7e201e))
* **mobile:** add syntax highlighting with react-native-code-highlighter ([15c29c7](https://github.com/planetaryescape/blah.chat/commit/15c29c7e17c860e804662e53488233fd9dd520cd))
* **mobile:** filter messages by active branch ([fedc446](https://github.com/planetaryescape/blah.chat/commit/fedc446ccd8cd7466c192ae315b7340c9f0b38e6))
* **mobile:** full-width assistant messages, compact user bubbles ([c3a19b4](https://github.com/planetaryescape/blah.chat/commit/c3a19b4f1c1c76e3d3faf72d389319ed9791a425))
* **mobile:** haptic feedback when streaming starts ([31f458e](https://github.com/planetaryescape/blah.chat/commit/31f458e1c0db20bba173b62966eee5ca1d8748c2))
* **mobile:** integrate branch navigation into message components ([916d976](https://github.com/planetaryescape/blah.chat/commit/916d9762c7986fe44ddf520503290329bfa654af))
* **mobile:** production-quality chat with dark theme and proper ordering ([cfe6188](https://github.com/planetaryescape/blah.chat/commit/cfe618854fad590a8df8da65134b96edbfc3daba))
* **mobile:** wire up branch actions in chat screen ([2e53ea3](https://github.com/planetaryescape/blah.chat/commit/2e53ea38af1fdf306cbaf6d4d0694c9a6a13cc77))
* **models:** add CLI for model management ([9904426](https://github.com/planetaryescape/blah.chat/commit/9904426d2e2a08aa6ce47fe7cf44fa707b1487b3))
* **models:** add database-backed model management ([325cb99](https://github.com/planetaryescape/blah.chat/commit/325cb996cbe076ab621f4c36bbbdcdee86b05b00))
* **models:** add Kimi K2.5 to static config for UI ([549c9a8](https://github.com/planetaryescape/blah.chat/commit/549c9a88bbce04ae7d12552c9f3be06f4571b8d2))
* **models:** migrate UI from static MODEL_CONFIG to database ([6fff32f](https://github.com/planetaryescape/blah.chat/commit/6fff32fd5df6be20c87028c96587ec8e9d436a7d))
* persist unsent message drafts in sessionStorage ([68601b0](https://github.com/planetaryescape/blah.chat/commit/68601b05aa17dff4899430638f8ce781d620debc))
* **recovery:** integrate lock release with stuck message recovery ([b7901ef](https://github.com/planetaryescape/blah.chat/commit/b7901efe504c44370e7de7299d961d0249c6dfa6))
* **schema:** add generationLocks table for concurrent generation prevention ([e5d1e3b](https://github.com/planetaryescape/blah.chat/commit/e5d1e3b95feee6bc82afbb358de96d81ad6bafba))
* **schema:** add retry tracking fields for auto-router recovery ([54f6054](https://github.com/planetaryescape/blah.chat/commit/54f6054c823be7b69870384bc9c04b6467ff91a0))
* **schema:** add tree-based message architecture fields (P7) ([d704352](https://github.com/planetaryescape/blah.chat/commit/d7043521360676f327408ac056643c1a7686f4bf))
* **scroll:** add scroll position restoration per conversation ([8f7a603](https://github.com/planetaryescape/blah.chat/commit/8f7a603c7d8bd844ba4d05337880fb4d18c59abd))
* **scroll:** add smooth scrolling animations ([65facdd](https://github.com/planetaryescape/blah.chat/commit/65facdd9b6095ab6b1170ad32d4039ba9e7deb60))
* **scroll:** add velocity-based scroll intent detection ([9a873a8](https://github.com/planetaryescape/blah.chat/commit/9a873a898207693d2a5e38375fd729211895fa5b))
* **api-client:** add publish-ready typed API client ([002152b](https://github.com/planetaryescape/blah.chat/commit/002152ba3a0c276316d11f5327067efc43cb9a37))
* **settings:** add haptic feedback toggle to UI settings ([ce2a3f4](https://github.com/planetaryescape/blah.chat/commit/ce2a3f4e9bd4c0425a9f6958b1820a22f974e0be))
* **settings:** wire hapticFeedbackEnabled to settings state ([4b23804](https://github.com/planetaryescape/blah.chat/commit/4b23804ee509deb1d62572859efca60ef8743177))
* **share:** add dynamic OG metadata to share pages ([f98494d](https://github.com/planetaryescape/blah.chat/commit/f98494d76f6ef698767a6145ef60f303c3931fc1))
* **shares:** add server-side metadata fetcher for OG tags ([ef05c36](https://github.com/planetaryescape/blah.chat/commit/ef05c36157990cf27fc3d4722b3684daf3673c67))
* **streaming:** add buffer state tracking to useStreamBuffer ([65d3ed2](https://github.com/planetaryescape/blah.chat/commit/65d3ed20b6d98125995894ce46cc18280b183aa2))
* **streaming:** add subtle fade animation for streaming text ([81a316a](https://github.com/planetaryescape/blah.chat/commit/81a316aead8328710607692d3b3ff5c3770b0c23))
* **tree:** add context, descendants, and subtree deactivation helpers ([7a6b4cf](https://github.com/planetaryescape/blah.chat/commit/7a6b4cf0b0dd28c63261bb37c10e80096fa05eb4))
* **triage:** task-aware model alternatives with same-family preference ([ddda5ee](https://github.com/planetaryescape/blah.chat/commit/ddda5ee84c277300e33cd283ca82a63a8b42ee4d))
* **ui:** add branch navigation components for tree architecture ([bb4b756](https://github.com/planetaryescape/blah.chat/commit/bb4b756d034fc3c506f7df094128c963cdc051b2))
* **ui:** add BranchComparisonSheet for side-by-side version comparison ([a96efe6](https://github.com/planetaryescape/blah.chat/commit/a96efe6d085fcb0dc1b284f28fdfdd048608e3e0))
* **ui:** add compare button to MessageBranchIndicator ([5d0df0f](https://github.com/planetaryescape/blah.chat/commit/5d0df0f09f3ada3e559804a8c49afc340306843b))
* **ui:** add Google service icons for integrations ([9cc4caa](https://github.com/planetaryescape/blah.chat/commit/9cc4caa2edc0434686e2241d63168d49a9227fe0))
* **ui:** add retry button and retry state indicator ([6bf2ce0](https://github.com/planetaryescape/blah.chat/commit/6bf2ce036cf174591207f0686cbf81a1872eb4c6))
* **ui:** add SVG icons for curated integrations ([bb4f74c](https://github.com/planetaryescape/blah.chat/commit/bb4f74c4a36ea1ed7512dc53d86fc8a6aed9c198))
* **web:** add UI controls for model recommendations preference ([01c08f5](https://github.com/planetaryescape/blah.chat/commit/01c08f56216ff875908285d57e9575405e6bfa73))


### Bug Fixes

* **a11y:** add fallback defaults for a11y preferences ([87280a2](https://github.com/planetaryescape/blah.chat/commit/87280a217636931a2587947470771cb08eaad089))
* **a11y:** address PR review feedback ([08ee45f](https://github.com/planetaryescape/blah.chat/commit/08ee45f056413ae912798cc0b58871d2c6e3b3ce))
* **a11y:** address PR review feedback ([cc07269](https://github.com/planetaryescape/blah.chat/commit/cc07269332f7a8f9011f18170f5c0a38bbdcd167))
* **a11y:** address PR review feedback ([5cb940a](https://github.com/planetaryescape/blah.chat/commit/5cb940a573c2f6e46b105692b94e2a97ce951f9f))
* **a11y:** combine effects to avoid classList race condition ([c4368c7](https://github.com/planetaryescape/blah.chat/commit/c4368c7422b6a3207571c2366380435e866e07b0))
* **a11y:** remove unused return from side-effect hook ([d1ee344](https://github.com/planetaryescape/blah.chat/commit/d1ee344ac03c848fd0faf898c16e3f77f0610cd2))
* add autoRouterEnabled and showSlides to preferences schema ([37e7fbb](https://github.com/planetaryescape/blah.chat/commit/37e7fbb6639e4f1561d464ae1c78000a9e70497d))
* add biome to root for BYOD sync script ([62fa326](https://github.com/planetaryescape/blah.chat/commit/62fa326645487b7f1b969b42c64fbd2261f4a597))
* add Bun setup to Vercel deploy workflow ([2b2d608](https://github.com/planetaryescape/blah.chat/commit/2b2d6089253e0c992a07c9e0950a5eef431dec97))
* add head_sha fallback for dependabot PR lookup ([f47ad3a](https://github.com/planetaryescape/blah.chat/commit/f47ad3a25bc1843ca477fe34d7ba3a7cf0c84880))
* add high-stakes fields to routing decision validators ([9b11480](https://github.com/planetaryescape/blah.chat/commit/9b114801d9700e07e9d0c5a113f97c76124af210))
* add keyboard animation delay and unmount safety ([4c3cf1b](https://github.com/planetaryescape/blah.chat/commit/4c3cf1ba6ca9093853b0e2643f6743a0c5608be5))
* add lock release on message creation failure and improve stale cleanup ([e643305](https://github.com/planetaryescape/blah.chat/commit/e64330569d71abe8bc42e1ac32514959606d88f2))
* add null guard instead of type assertion for stableCode ([da732f2](https://github.com/planetaryescape/blah.chat/commit/da732f29406bb675de55b15847d5bec5043072fc))
* add outbound tool-name diagnostics on generation failures ([3a60fbe](https://github.com/planetaryescape/blah.chat/commit/3a60fbec3b257b87c5f726ae2c7303e3e84f6e91))
* address CI failures and PR review comments ([ac17973](https://github.com/planetaryescape/blah.chat/commit/ac17973fdcea28b2eae44fe9bd0db586cc3007f4))
* address code review feedback ([3416d9f](https://github.com/planetaryescape/blah.chat/commit/3416d9f4f80c60abf1febb130aa118479f2e6d80))
* address code review feedback ([4159b41](https://github.com/planetaryescape/blah.chat/commit/4159b41695e7a4d54eb1041efe3b5ab5559158e8))
* address code review feedback for generation lock ([c3eafed](https://github.com/planetaryescape/blah.chat/commit/c3eafed98200076ac968ff395017c6ad226febd1))
* address PR review comments ([b296179](https://github.com/planetaryescape/blah.chat/commit/b2961793193fde25260c7b7af628993b60758acc))
* address PR review comments and fix CI ([d599305](https://github.com/planetaryescape/blah.chat/commit/d599305cbf427e27470a4d2e97ea4642aec50000))
* address PR review feedback ([a7b9aab](https://github.com/planetaryescape/blah.chat/commit/a7b9aab249dd6c39b0901dd168b2ecfd18bedc1b))
* address PR review feedback ([d51209f](https://github.com/planetaryescape/blah.chat/commit/d51209f009ff0705a42e2a001018ebf1d4dbd338))
* **admin:** address code review feedback ([7d5ab1c](https://github.com/planetaryescape/blah.chat/commit/7d5ab1c2e1a99a31a76016a3f64998e6a14c0398))
* **admin:** fix page overflow and scrolling issues ([db14be5](https://github.com/planetaryescape/blah.chat/commit/db14be54f047eb561d1fbc97492ab1717457711f))
* **admin:** replace native confirm() with AlertDialog ([64967d6](https://github.com/planetaryescape/blah.chat/commit/64967d6d0d7b0602deed314c6f861190af888dae))
* **admin:** replace native dialogs with shadcn components ([6e19bd8](https://github.com/planetaryescape/blah.chat/commit/6e19bd8f7f267e64fefc00bdf30f41309fbd70ba))
* **admin:** use Clerk session for admin check instead of Convex ([3888bde](https://github.com/planetaryescape/blah.chat/commit/3888bde281397aa773cb2152cef6a784d5017e5c))
* **admin:** wrap ScrollArea properly for correct overflow handling ([f4667cb](https://github.com/planetaryescape/blah.chat/commit/f4667cb14b035dae1d6e0f9667cf7d594c5fb153))
* **ai:** correct Frankfurter API endpoint and add response typing ([0a86ac0](https://github.com/planetaryescape/blah.chat/commit/0a86ac00921109a0bf0c0f083fb0eb6ef887a1bb))
* **ai:** use URLSearchParams and add 10s timeout for currency converter ([524df55](https://github.com/planetaryescape/blah.chat/commit/524df552fe9b54a4d3d22b1b82ce0982ecafa7ee))
* allow bible:// protocol in Streamdown link safety ([7e85358](https://github.com/planetaryescape/blah.chat/commit/7e85358aa77744927ac33ca1182f8d6611736633))
* always set input on conversation switch to clear stale text ([49dccb5](https://github.com/planetaryescape/blah.chat/commit/49dccb5add29b89022912e95c1e1b5757bec7ea7))
* **auto-router:** validate capabilities before sticky routing ([21399c0](https://github.com/planetaryescape/blah.chat/commit/21399c049f31506de5ddd17ab4d7f3ac06f811de))
* **backend:** add missing getUserPreferenceState query ([ba4908d](https://github.com/planetaryescape/blah.chat/commit/ba4908dcca7f9864b92abaf1a2b51531628c70a4))
* **backend:** deactivate descendants when editing message ([fd2ee5f](https://github.com/planetaryescape/blah.chat/commit/fd2ee5fb07f5cfd8659182ebb967b60f0c8db664))
* **backend:** gracefully handle AI provider errors in title generation ([557a2cf](https://github.com/planetaryescape/blah.chat/commit/557a2cf79fcd32925f084599b2fb340710e51703))
* **backend:** log usage tracking errors in title generation ([df553fd](https://github.com/planetaryescape/blah.chat/commit/df553fd42384e131ee35b85db44d13a3e9db35b0))
* **backend:** move native deps to optionalDependencies for mobile builds ([e9fad60](https://github.com/planetaryescape/blah.chat/commit/e9fad60c705ff649b4c112c4d18b5418f5d7e13c))
* **backend:** query children by both parentMessageIds and parentMessageId ([e4e92de](https://github.com/planetaryescape/blah.chat/commit/e4e92de1bcb54db8103380da5fe249618c28cbc0))
* BYOD sync script outputs Biome-compliant code ([5db7695](https://github.com/planetaryescape/blah.chat/commit/5db7695b358d99ff64fad1bb570676da52bb8b0d))
* capture stableCode in closure to prevent async race conditions ([dfd264c](https://github.com/planetaryescape/blah.chat/commit/dfd264cf7e0d88deba2a9b2fac62f1a5f57c4fca))
* **chat:** add type=button to prevent form submission ([a77ec69](https://github.com/planetaryescape/blah.chat/commit/a77ec69871851c945e033910cd9bcb1f7fcaf646))
* **chat:** debounce mermaid rendering to prevent streaming errors ([f0a5dfb](https://github.com/planetaryescape/blah.chat/commit/f0a5dfbbfbaa0c7e59920d82b97d05ed51053c6a))
* **chat:** extract conversationId from branchFromMessage result ([2765d70](https://github.com/planetaryescape/blah.chat/commit/2765d7027939b49ed4a5b458463c6f2b4ba83161))
* **chat:** graceful StatusTimeline exit animation and aria-busy string ([cc43b6d](https://github.com/planetaryescape/blah.chat/commit/cc43b6d4a0e4aa60582e1d0b4284cc23a36a59fa))
* **chat:** improve mobile UX for input focus and message display ([76c7277](https://github.com/planetaryescape/blah.chat/commit/76c72779cba151b9fa529963b67a1c90c4882b84))
* **chat:** prevent toolbar buttons from triggering form submission ([808a221](https://github.com/planetaryescape/blah.chat/commit/808a2211f18f0229be0229a2697572096d652677))
* **chat:** use actual routed model for Auto context window display ([1344423](https://github.com/planetaryescape/blah.chat/commit/1344423694e221dc9d0ef48afc04da84270aceb1))
* **chat:** use padding instead of margin for Virtuoso height measurement ([364e55d](https://github.com/planetaryescape/blah.chat/commit/364e55d0d658fbc0035f95ea78d9ea1f57167146))
* **ci:** add checkout step to dependabot auto-merge workflow ([5028263](https://github.com/planetaryescape/blah.chat/commit/5028263b9a2e40c46e230d89c66bcfafa082f9a7))
* **ci:** align release-please with easydeck pattern ([9eaa294](https://github.com/planetaryescape/blah.chat/commit/9eaa2944537fd8c1c879e6845d788e7077f76540))
* **ci:** fallback portable check when rg missing ([de77b42](https://github.com/planetaryescape/blah.chat/commit/de77b427ab1d440253b7bd5b04ada88e30b3666a))
* **ci:** handle shallow sdk version check ([998441c](https://github.com/planetaryescape/blah.chat/commit/998441c2931e35f2f60724a97e550eee1306df8e))
* **ci:** stabilize failing PR checks ([cc2412f](https://github.com/planetaryescape/blah.chat/commit/cc2412f40e66e4d8c3be060b60a0e392ca3e70b6))
* **ci:** use draft-then-publish for immutable releases ([8056fc7](https://github.com/planetaryescape/blah.chat/commit/8056fc773a4ec30aa5b02b85ed072e397cf4727f))
* **ci:** use macos-13 for darwin-x64 CLI builds ([#276](https://github.com/planetaryescape/blah.chat/issues/276)) ([801280d](https://github.com/planetaryescape/blah.chat/commit/801280d63addc175130d3637e3e059024e2da087))
* **ci:** use macos-15-large for darwin-x64 (macos-13 retired) ([cf707a0](https://github.com/planetaryescape/blah.chat/commit/cf707a0a9bbe7f46bb644f7e262383c46977b5b5))
* **ci:** use macos-15-large for darwin-x64 CLI builds ([382be1b](https://github.com/planetaryescape/blah.chat/commit/382be1b224d538482c3cd5161e3f2dc28432e2d4))
* **ci:** use tab delimiter when parsing gh release list ([f3de5bc](https://github.com/planetaryescape/blah.chat/commit/f3de5bcc41fb8465197bcbe28cdc091db2f28b90))
* clarify retry count semantics ([8fa477d](https://github.com/planetaryescape/blah.chat/commit/8fa477dfe1d253f55deb41a0979d008cbe893f9a))
* **cli:** address PR review issues ([6651ee7](https://github.com/planetaryescape/blah.chat/commit/6651ee7afe5ed735cd7d2129f87083bea0cb2566))
* **cli:** await async actions and add --api-key login option ([4f67ad9](https://github.com/planetaryescape/blah.chat/commit/4f67ad94fc952171a0841bea552a28683b0421d6))
* **cli:** bind chat input value so it clears after send ([7a0314c](https://github.com/planetaryescape/blah.chat/commit/7a0314c3ec3c5559b08e3143c6fd5c1397d0ee79))
* **cli:** install cross-platform opentui binaries before compile ([917e656](https://github.com/planetaryescape/blah.chat/commit/917e65656379b92bfac1e6cb4b8cb638613d368e))
* **cli:** resolve parser.worker.js from package root ([9882e32](https://github.com/planetaryescape/blah.chat/commit/9882e3231d94bbaa64640590e1754a2a3f45a240))
* **cli:** resolve TreeSitter worker path in compiled binary ([247c92c](https://github.com/planetaryescape/blah.chat/commit/247c92cc03b68b9d9b55c82ccc3f5e5b5a8aa429))
* **cli:** split scoped package name in postinstall path join ([a84c231](https://github.com/planetaryescape/blah.chat/commit/a84c231256576ccde60969967e79205a85dc2f89))
* **cli:** split scoped package name into path segments for join() ([b81c5d6](https://github.com/planetaryescape/blah.chat/commit/b81c5d69ffdb37928f386937c42c273114b28450))
* **cli:** use Bun.build with solid plugin for JSX transform ([5d4de40](https://github.com/planetaryescape/blah.chat/commit/5d4de402e563233aecf62a95a57c812b08927cef))
* **cli:** use cli-v tag format and remove darwin-x64 ([68dd7ad](https://github.com/planetaryescape/blah.chat/commit/68dd7ad762a3bbb252ea3449872a3fa675edacd6))
* **cli:** use native runners for cross-platform builds ([45148d5](https://github.com/planetaryescape/blah.chat/commit/45148d5302307ae0d5c6a5396603d969b80ed1a5))
* **cli:** use PowerShell Compress-Archive on Windows ([e086fb1](https://github.com/planetaryescape/blah.chat/commit/e086fb18e1d3ca4b39c48aa11cc6a140368fa787))
* **composio:** fix Convex runtime and Composio SDK API issues ([6fea169](https://github.com/planetaryescape/blah.chat/commit/6fea169ff2632953a5cbb9604185fcb084cea844))
* **composio:** include CSRF state in OAuth callback URL ([acfde25](https://github.com/planetaryescape/blah.chat/commit/acfde253e34dd1acae93d827d08abbe3cc64feef))
* **composio:** preserve active status during re-auth to prevent tool access loss ([5bc0943](https://github.com/planetaryescape/blah.chat/commit/5bc0943244ce323bb55fe3a83545739ca03d46e7))
* **composio:** prioritize connectedAccountId param, add verification note ([de7060a](https://github.com/planetaryescape/blah.chat/commit/de7060a562a665277b8b35a546506123a4ed6098))
* **composio:** reduce to 10 OAuth integrations for reliability ([dee657b](https://github.com/planetaryescape/blah.chat/commit/dee657b1dd8663acdf7e22812e2885964f72fdf5))
* configure EAS to use bun install ([91b4abf](https://github.com/planetaryescape/blah.chat/commit/91b4abf447b8122f5e0a885ecc7ecf545a2132a2))
* **conversations:** resolve bulk delete byte limit error ([3ada05d](https://github.com/planetaryescape/blah.chat/commit/3ada05d17e74a00eb0c8550e66c34b50ae6e8268))
* correct off-by-one in retry count comparison ([41dafba](https://github.com/planetaryescape/blah.chat/commit/41dafba3a7883259f4681d9e98b44976eabecc1a))
* detect dependabot PR number from workflow_run payload ([4f2dc10](https://github.com/planetaryescape/blah.chat/commit/4f2dc1035b052ffe1be1f11ffdea403f2904f3f0))
* enforce tool name limits at generation preflight ([59a311c](https://github.com/planetaryescape/blah.chat/commit/59a311c61325481f6c3cb53550dd8f84113a7d87))
* extend try/catch to cover scheduler calls for belt-and-suspenders safety ([ed43470](https://github.com/planetaryescape/blah.chat/commit/ed43470f22cb9d983d530c1335a12a300adf8120))
* **generation:** address code review feedback ([1100213](https://github.com/planetaryescape/blah.chat/commit/1100213c73c64befcfcdc0a36aa08b4b4a23e0ae))
* **generation:** address PR review comments ([9e0e50e](https://github.com/planetaryescape/blah.chat/commit/9e0e50e077c5b7d89a0f0899d2165bad6bb964ef))
* **generation:** calculate TPS using pure API wait time ([46354b9](https://github.com/planetaryescape/blah.chat/commit/46354b99647351a8f5d59f2bd96ce50b2356497c))
* **generation:** calculate wasted cost from actual accumulated tokens ([12bbd9b](https://github.com/planetaryescape/blah.chat/commit/12bbd9b9ab2a7e32d69e6fca6e71187b6b23da35))
* **generation:** cleanup partial tool calls on error paths ([40c170b](https://github.com/planetaryescape/blah.chat/commit/40c170bae7c14eb154965501fed4dcbb9007ef51))
* **generation:** include input tokens in wasted cost calculation ([ef48a55](https://github.com/planetaryescape/blah.chat/commit/ef48a5583a85d3e204d57b7c47325cf8e5591940))
* **generation:** include tool-call chunks in TPS wait time ([3376aa3](https://github.com/planetaryescape/blah.chat/commit/3376aa3d5ec12080904bcc1fe12b01351f017c5b))
* **generation:** prevent race condition in message status updates ([5e86bc2](https://github.com/planetaryescape/blah.chat/commit/5e86bc20881871a4ceeda2f79df90e5baa59b14a))
* **generation:** prevent Unicode splitting crashes ([5745e3d](https://github.com/planetaryescape/blah.chat/commit/5745e3d8aac13a579dbcc8c22e0ccbf348b5b7d6))
* handle missing premium models for high-stakes queries ([f903e06](https://github.com/planetaryescape/blah.chat/commit/f903e066b18f05a5e6464d2ab4a66e0b39e77cee))
* harden desktop release checks and docs ([c3370ea](https://github.com/planetaryescape/blah.chat/commit/c3370eab3a770ff9ee9b4a9360894d69bc2b3bf0))
* harden tool name collision handling ([edc26a7](https://github.com/planetaryescape/blah.chat/commit/edc26a7caa929c12cc511354aad363be75c11938))
* harden touch chat input focus stability ([5291ac0](https://github.com/planetaryescape/blah.chat/commit/5291ac08abd9464c6cf9fe9a430e10c3969a8831))
* improve internal tool priority when Composio active ([57911e0](https://github.com/planetaryescape/blah.chat/commit/57911e06ec552525614c85f5fc10378440f20ad5))
* increase scroll threshold, improve type safety ([d519317](https://github.com/planetaryescape/blah.chat/commit/d5193177cf31848b7d8442a81fe89a9b1665f197))
* **input:** prevent Enter submission during IME composition ([379135f](https://github.com/planetaryescape/blah.chat/commit/379135f22cb44b824f6077a6a30e57126b594043))
* **install:** use INSTALL_DIR for PATH instead of hardcoded path ([fd2497a](https://github.com/planetaryescape/blah.chat/commit/fd2497afb1a93a7e8c327cce8720936b64f79bd4))
* iOS Safari virtual keyboard covering input field ([779e57c](https://github.com/planetaryescape/blah.chat/commit/779e57c3a7d6d6d777b55472d206d72fb85052f8))
* make isHighStakes optional for backward compatibility ([abc8bb8](https://github.com/planetaryescape/blah.chat/commit/abc8bb81adc0baeab60e936611e5cd9d074ea361))
* **markdown:** allow bible:// protocol in rehype-harden ([d458222](https://github.com/planetaryescape/blah.chat/commit/d458222af0c1486e3488a73d9c7dbd9d0673ba1e))
* **markdown:** remove rehypeSanitize blocking bible:// links ([7792a2e](https://github.com/planetaryescape/blah.chat/commit/7792a2e4bd4ac48896ac129c918eaf519feb3504))
* **memory:** prevent timer leaks in TTS and copy handlers ([e746a0c](https://github.com/planetaryescape/blah.chat/commit/e746a0c78459f515f3c526d6a66a826925011625))
* **mobile:** add eas-build-pre-install hook for bun detection ([44598b1](https://github.com/planetaryescape/blah.chat/commit/44598b1774ff98e9ec8a1d52b52f7708a6a7a83f))
* **mobile:** add eas-build-pre-install to mobile package.json ([f3fd53c](https://github.com/planetaryescape/blah.chat/commit/f3fd53c94b15e56acbacaba9eb61e38e9341bd87))
* **mobile:** add empty bun.lockb for EAS package manager detection ([e3b3187](https://github.com/planetaryescape/blah.chat/commit/e3b318735005b440accf35f3f23a8c3e7510fc94))
* **mobile:** add external browser fallback for Mermaid diagrams ([5e1ee8a](https://github.com/planetaryescape/blah.chat/commit/5e1ee8a5a198d9327177ba7448515114bba21e05))
* **mobile:** address security issues from code review ([de7933e](https://github.com/planetaryescape/blah.chat/commit/de7933e3d00094730a59decaeee978b50ec2dc7e))
* **mobile:** balance user bubble padding (16h x 8v) ([72915eb](https://github.com/planetaryescape/blah.chat/commit/72915eb39cc7297d41462f45fcf3b1f76abe4b5d))
* **mobile:** check typeof for optimistic ID detection ([6bdbdaf](https://github.com/planetaryescape/blah.chat/commit/6bdbdafa0bc41348bc403fdbb7ac4d7d99fb8cfd))
* **mobile:** delete lockfile in pre-install to bypass frozen-lockfile ([b10f696](https://github.com/planetaryescape/blah.chat/commit/b10f696c9a21822b74906ac2fe21ca3d09ac41aa))
* **mobile:** disable typecheck that fails on backend path aliases ([f3c1822](https://github.com/planetaryescape/blah.chat/commit/f3c1822c46d17542ae816bae01f1f7c0bf0c3ead))
* **mobile:** handle Mermaid CDN failure gracefully ([8abce84](https://github.com/planetaryescape/blah.chat/commit/8abce84840eb593395626cd8e6665c1ba0f640db))
* **mobile:** improve LaTeX detection and fallback rendering ([0b79d8e](https://github.com/planetaryescape/blah.chat/commit/0b79d8e9f7c80cbbb9ac5cbcfa247808f65c8617))
* **mobile:** improve WebView detection and LaTeX fallback ([31ab479](https://github.com/planetaryescape/blah.chat/commit/31ab4794625d9a1448778b8e954d3558bdd9e9d6))
* **mobile:** include bun.lock in EAS builds for package manager detection ([1954360](https://github.com/planetaryescape/blah.chat/commit/1954360690aece8380a2049d12311c6be59bca4a))
* **mobile:** increase chat text weight to medium ([639f98f](https://github.com/planetaryescape/blah.chat/commit/639f98fdeb75cdcfbffcfe3b6b51dce79a14cf22))
* **mobile:** increase dedup window to 30s for slow networks ([3f64e81](https://github.com/planetaryescape/blah.chat/commit/3f64e81ec8be3dec068acacebc5bed2c92522fdb))
* **mobile:** make Bible verse links inline with Text onPress ([6be6087](https://github.com/planetaryescape/blah.chat/commit/6be6087c2fa3d55714fbbb66b1ede51184bdf1f4))
* **mobile:** match Bible verse link color to web primary ([68535e5](https://github.com/planetaryescape/blah.chat/commit/68535e564e9eddde7b5fee3fe6b64aee54965b71))
* **mobile:** regenerate bun.lock for EAS frozen lockfile ([8047960](https://github.com/planetaryescape/blah.chat/commit/80479609f0c6b218fd4697953a382b7a65b0d4d5))
* **mobile:** remove console.error in favor of graceful handling ([ab4ef47](https://github.com/planetaryescape/blah.chat/commit/ab4ef477696db0c15d3c6633e10121faa31ebf80))
* **mobile:** remove unused variables in mathProcessor ([a4f92e5](https://github.com/planetaryescape/blah.chat/commit/a4f92e5c1d8a87d46835c9e08bc590e9acd67b2a))
* **mobile:** replace broken syntax highlighter with native code display ([bc1ea5e](https://github.com/planetaryescape/blah.chat/commit/bc1ea5edbc16b4dc6a82b6ae68dfcef5201e0564))
* **mobile:** resolve React version mismatch and remove Moti ([fff65a8](https://github.com/planetaryescape/blah.chat/commit/fff65a8c5d66950b6417663f916e063aeb6aa6e7))
* **mobile:** resolve TypeScript errors for CI ([c8134a1](https://github.com/planetaryescape/blah.chat/commit/c8134a10c4ff505939b1976d4d0b7ad5f3394795))
* **mobile:** safely handle WebView native module in Expo Go ([2db784d](https://github.com/planetaryescape/blah.chat/commit/2db784da30a301795626b1c422da8db71b13de12))
* **mobile:** save as note sheet not opening ([8315588](https://github.com/planetaryescape/blah.chat/commit/83155887010d7b8bd450ddb79613749c2829d0bf))
* **mobile:** sync bun version to 1.3.5 across all configs ([2c55cd1](https://github.com/planetaryescape/blah.chat/commit/2c55cd1165a9bf1f9c559f3f60a898a5285db19a))
* **mobile:** transpile bible-passage-reference-parser private class fields ([c85efc3](https://github.com/planetaryescape/blah.chat/commit/c85efc397b1597efe4cd41b255b7ec2b7831bc5e))
* **mobile:** use glass-style user bubble matching web ([f6c47e4](https://github.com/planetaryescape/blah.chat/commit/f6c47e46c135c92c7bf516e27908200ba2cd2f4c))
* **mobile:** use inline hljs style for syntax highlighter ([f484f5d](https://github.com/planetaryescape/blah.chat/commit/f484f5d61121187a03274bd331bc41affbd617c3))
* **mobile:** use primary color for all links in markdown ([31a8413](https://github.com/planetaryescape/blah.chat/commit/31a8413184f8399fa67e127dd7b4ef2b15dbc0d7))
* **mobile:** use RNGH TouchableOpacity for drawer gesture compatibility ([1e028e8](https://github.com/planetaryescape/blah.chat/commit/1e028e8aaa651ebc933778563d408650dede7ce1))
* **models:** cascade delete profiles and safe JSON parsing ([b6b5c4d](https://github.com/planetaryescape/blah.chat/commit/b6b5c4d313ec7bf27c4a7f86db200c76067ccdd8))
* **models:** fallback to static config when DB is empty ([ae36f2a](https://github.com/planetaryescape/blah.chat/commit/ae36f2ab44bdb0c76cae44681c09fd9d91918202))
* **models:** run convex CLI from backend directory ([4385e10](https://github.com/planetaryescape/blah.chat/commit/4385e10df1aeb889fd5ec629c9392d33d040936e))
* move markError before releaseLock to prevent stuck state ([feb0df3](https://github.com/planetaryescape/blah.chat/commit/feb0df3b14ad44c67defaec39544acbeeb845c51))
* normalize tool names to satisfy provider limits ([867257e](https://github.com/planetaryescape/blah.chat/commit/867257e644563b51ffd8ae0d1994d37f48420900))
* preserve mobile chat input caret focus ([7b76569](https://github.com/planetaryescape/blah.chat/commit/7b76569e287ea4d45e88fa526f99436e2c84f9b2))
* prevent infinite render loop in useIOSKeyboard ([5ec3559](https://github.com/planetaryescape/blah.chat/commit/5ec355995da1c06e4e8a55096430993cf1a1d27a))
* prevent stale autorelease pending labels ([180583b](https://github.com/planetaryescape/blah.chat/commit/180583b6b087d21bd15b4726b88ad05de5df94de))
* **raycast:** relax lint for bun-only workspace ([1f50881](https://github.com/planetaryescape/blah.chat/commit/1f5088133d507159514cc83fbb67f98e570b9d05))
* read textarea.value to avoid race condition in insertTextAtCursor ([e5792a1](https://github.com/planetaryescape/blah.chat/commit/e5792a195a4127326ed80340540b6d5baba6c6bb))
* release lock in test between consecutive sends ([7e242ab](https://github.com/planetaryescape/blah.chat/commit/7e242ab3de8910261929d795a696fea26c276b61))
* remove early lock check, fix atomicity comment ([6f2f696](https://github.com/planetaryescape/blah.chat/commit/6f2f6960d5909936ba88d8e317d92aafe2c386cb))
* remove invalid install config from eas.json ([16a21e2](https://github.com/planetaryescape/blah.chat/commit/16a21e2cb04ef03888721d97ce1346a8d7c6d78c))
* remove lock refresh in cleanup - let stuck message recovery handle it ([96627cc](https://github.com/planetaryescape/blah.chat/commit/96627cc9700a44e1882dba8a4717834a3cf37e59))
* remove underscore prefix from isComposing variable ([69b2a68](https://github.com/planetaryescape/blah.chat/commit/69b2a685f9b01920146e8c6feeb2ed4505589975))
* remove unused Buffer import and mapping ([af0c0de](https://github.com/planetaryescape/blah.chat/commit/af0c0def19d5bc83cb06390f2dcd3122b3cf5edc))
* repair dependabot merge automation ([b1e1ee6](https://github.com/planetaryescape/blah.chat/commit/b1e1ee6542c9e509a49baa5be5c82403fafee812))
* require Developer ID cert for desktop release ([08877a8](https://github.com/planetaryescape/blah.chat/commit/08877a81c8adc1e892c4177978a0372174502b95))
* resolve type errors for CI ([7bdabee](https://github.com/planetaryescape/blah.chat/commit/7bdabee2ee5a079581b49d4242551a7ea91db27f))
* resolve type errors in VirtualizedMessageList and generation ([5cd9eeb](https://github.com/planetaryescape/blah.chat/commit/5cd9eeb763640531f402d58e7e39c3a5496d3566))
* **router:** improve high-stakes topic detection for medical advice ([2627316](https://github.com/planetaryescape/blah.chat/commit/262731686a785ea3df1e1b6c3b1aa0a6a1813acc))
* **scroll:** use correct scrollToBottom function signature ([f798511](https://github.com/planetaryescape/blah.chat/commit/f798511d0bd4b0c825ae092acb115b600a991c6c))
* **security:** add admin authorization to admin-only model queries ([547113c](https://github.com/planetaryescape/blah.chat/commit/547113c6931668b44b2af8e2a75a627e5687cfb5))
* **security:** add input validation for model IDs ([e3eb676](https://github.com/planetaryescape/blah.chat/commit/e3eb676ac3cd851ab05ad056af4a9c0f9d9d0054))
* **security:** address critical OAuth vulnerabilities ([a7d6485](https://github.com/planetaryescape/blah.chat/commit/a7d648540f6493c2632fd481fc422ba079c061d5))
* **security:** hardcode production domain for postMessage origin ([0c32693](https://github.com/planetaryescape/blah.chat/commit/0c326930414dff497bc81eed2f71902c6f43ee2c))
* **security:** move DOMPurify sanitization to main thread ([01d5dca](https://github.com/planetaryescape/blah.chat/commit/01d5dca2071f57eee36518262915bdbda7e5e9bc))
* **security:** strengthen CSRF and XSS protections ([f726e26](https://github.com/planetaryescape/blah.chat/commit/f726e26a7856685fcddd23700ceb19b8556d6e99))
* **settings:** handle undefined recentModels array ([0202ca8](https://github.com/planetaryescape/blah.chat/commit/0202ca881c48c01d82e98b58a8ac7cf3d29e5537))
* **settings:** sticky tabs and pending connection UX ([0029987](https://github.com/planetaryescape/blah.chat/commit/00299871805b67b46970b49d6f578d3d1ef7ef7d))
* **shares:** show expired state instead of not found for expired shares ([96c8c89](https://github.com/planetaryescape/blah.chat/commit/96c8c89e4054744861123d647c6a42c25e0cea2f))
* skip desktop build on non-mac CI hosts ([60fe91e](https://github.com/planetaryescape/blah.chat/commit/60fe91e009ce38e39717c0ac0cfab2d89f6800a7))
* stabilize desktop build and updater defaults ([00f91cf](https://github.com/planetaryescape/blah.chat/commit/00f91cf01701a6a78ebbed1daf65f3b0aff2c097))
* stabilize iOS mobile chat input focus ([4e920ab](https://github.com/planetaryescape/blah.chat/commit/4e920ab9a5565a0c4b4d7fe73a5818b1e5c7f2dd))
* **test:** add missing get/put mocks to userPreferences cache ([7cbea3f](https://github.com/planetaryescape/blah.chat/commit/7cbea3ff1bbab9c79948d64e8ef98bb15b4b8eae))
* **tree:** ensure deactivateSubtree patches undefined isActiveBranch values ([9fc88f5](https://github.com/planetaryescape/blah.chat/commit/9fc88f5eab1b93156294a1cefd68b6fdc5830cdc))
* **tree:** prevent duplicate IDs in BFS traversal for DAG with multi-parent nodes ([9fecdcc](https://github.com/planetaryescape/blah.chat/commit/9fecdcc8a8799620cb1b6c02f1c0aa236e75060e))
* **triage:** use model.provider for same-family bonus ([e8e031f](https://github.com/planetaryescape/blah.chat/commit/e8e031fa851c63a926627a41b1c4a282d4430cb0))
* **ui:** improve tool call display and integrations list ([37fc858](https://github.com/planetaryescape/blah.chat/commit/37fc8581591e7e55b24a1b4bfa53013a2e726324))
* **ui:** prevent iOS Safari auto-zoom on input focus ([601fe49](https://github.com/planetaryescape/blah.chat/commit/601fe494c3086fed07cf119f8408fd4e85f59f50))
* use bun x for Biome in sync script ([8e15387](https://github.com/planetaryescape/blah.chat/commit/8e15387d8f9093877ff5841ed8eb20f1b8c9015d))
* use estimateTokens from counting.ts consistently ([acb4d0d](https://github.com/planetaryescape/blah.chat/commit/acb4d0d08f8652ba116c1d1d5350fb9cab34d9af))
* use legacy bible parser bundle in mobile build ([39a5acd](https://github.com/planetaryescape/blah.chat/commit/39a5acdffdce07439babdbdf38b8a1cc978b421d))
* validate fallback model and sync pre-created message model ([3692f65](https://github.com/planetaryescape/blah.chat/commit/3692f65e4b590118d993b2cf403fd814df0b542e))
* **web:** escape &gt; characters in JSX DialogDescription ([fee5383](https://github.com/planetaryescape/blah.chat/commit/fee5383da3fe9b9fcb37ff671e42eff4a4577c8b))
* **web:** increase assistant message font weight to medium ([84b780c](https://github.com/planetaryescape/blah.chat/commit/84b780cb9ce98adc26cf8210011b5c658715139e))
* wrap streamText in try/catch, reset haptic ref on conversation change ([44e8321](https://github.com/planetaryescape/blah.chat/commit/44e8321e074bae932395cc2821fb21620217434d))


### Performance Improvements

* extract sortedCalls to separate useMemo in InlineToolCallContent ([4e41ecb](https://github.com/planetaryescape/blah.chat/commit/4e41ecb911924b3d70f2b139794de37c1f68c41c))
* **generation:** fix race condition in stop generation ([2ebc530](https://github.com/planetaryescape/blah.chat/commit/2ebc530544d860077461a2475f267c617120d6dd))
* **mobile:** optimize chat rendering and message deduplication ([520b99b](https://github.com/planetaryescape/blah.chat/commit/520b99b13aa0f9230de58777661758017d010001))

## [1.22.4](https://github.com/planetaryescape/blah.chat/compare/v1.22.3...v1.22.4) (2026-02-08)


### Bug Fixes

* harden desktop release checks and docs ([c3370ea](https://github.com/planetaryescape/blah.chat/commit/c3370eab3a770ff9ee9b4a9360894d69bc2b3bf0))

## [1.22.3](https://github.com/planetaryescape/blah.chat/compare/v1.22.2...v1.22.3) (2026-02-08)


### Bug Fixes

* harden desktop release checks and docs ([c3370ea](https://github.com/planetaryescape/blah.chat/commit/c3370eab3a770ff9ee9b4a9360894d69bc2b3bf0))

## [1.22.2](https://github.com/planetaryescape/blah.chat/compare/v1.22.1...v1.22.2) (2026-02-08)


### Bug Fixes

* add outbound tool-name diagnostics on generation failures ([3a60fbe](https://github.com/planetaryescape/blah.chat/commit/3a60fbec3b257b87c5f726ae2c7303e3e84f6e91))
* enforce tool name limits at generation preflight ([59a311c](https://github.com/planetaryescape/blah.chat/commit/59a311c61325481f6c3cb53550dd8f84113a7d87))
* harden tool name collision handling ([edc26a7](https://github.com/planetaryescape/blah.chat/commit/edc26a7caa929c12cc511354aad363be75c11938))
* harden touch chat input focus stability ([5291ac0](https://github.com/planetaryescape/blah.chat/commit/5291ac08abd9464c6cf9fe9a430e10c3969a8831))
* normalize tool names to satisfy provider limits ([867257e](https://github.com/planetaryescape/blah.chat/commit/867257e644563b51ffd8ae0d1994d37f48420900))
* use legacy bible parser bundle in mobile build ([39a5acd](https://github.com/planetaryescape/blah.chat/commit/39a5acdffdce07439babdbdf38b8a1cc978b421d))

## [1.22.1](https://github.com/planetaryescape/blah.chat/compare/v1.22.0...v1.22.1) (2026-02-07)


### Bug Fixes

* add head_sha fallback for dependabot PR lookup ([f47ad3a](https://github.com/planetaryescape/blah.chat/commit/f47ad3a25bc1843ca477fe34d7ba3a7cf0c84880))
* detect dependabot PR number from workflow_run payload ([4f2dc10](https://github.com/planetaryescape/blah.chat/commit/4f2dc1035b052ffe1be1f11ffdea403f2904f3f0))
* preserve mobile chat input caret focus ([7b76569](https://github.com/planetaryescape/blah.chat/commit/7b76569e287ea4d45e88fa526f99436e2c84f9b2))

## [1.22.0](https://github.com/planetaryescape/blah.chat/compare/v1.21.0...v1.22.0) (2026-02-07)


### Features

* add desktop app shell and automated release pipeline ([6dddde1](https://github.com/planetaryescape/blah.chat/commit/6dddde1e62a3d520e3d3e4a856f88e10ff74fe4c))
* **api:** harden authz and portable SSE ([3467a01](https://github.com/planetaryescape/blah.chat/commit/3467a014321477240fa8884a25959f6b1b4ecfe1))
* **clients:** migrate clients to SDK transport ([864908c](https://github.com/planetaryescape/blah.chat/commit/864908c29f8957c854c28b0e98f7b5771164bd66))
* **api-client:** add publish-ready typed API client ([002152b](https://github.com/planetaryescape/blah.chat/commit/002152ba3a0c276316d11f5327067efc43cb9a37))


### Bug Fixes

* add head_sha fallback for dependabot PR lookup ([f47ad3a](https://github.com/planetaryescape/blah.chat/commit/f47ad3a25bc1843ca477fe34d7ba3a7cf0c84880))
* **ci:** fallback portable check when rg missing ([de77b42](https://github.com/planetaryescape/blah.chat/commit/de77b427ab1d440253b7bd5b04ada88e30b3666a))
* **ci:** handle shallow sdk version check ([998441c](https://github.com/planetaryescape/blah.chat/commit/998441c2931e35f2f60724a97e550eee1306df8e))
* **ci:** stabilize failing PR checks ([cc2412f](https://github.com/planetaryescape/blah.chat/commit/cc2412f40e66e4d8c3be060b60a0e392ca3e70b6))
* detect dependabot PR number from workflow_run payload ([4f2dc10](https://github.com/planetaryescape/blah.chat/commit/4f2dc1035b052ffe1be1f11ffdea403f2904f3f0))
* **raycast:** relax lint for bun-only workspace ([1f50881](https://github.com/planetaryescape/blah.chat/commit/1f5088133d507159514cc83fbb67f98e570b9d05))
* repair dependabot merge automation ([b1e1ee6](https://github.com/planetaryescape/blah.chat/commit/b1e1ee6542c9e509a49baa5be5c82403fafee812))
* skip desktop build on non-mac CI hosts ([60fe91e](https://github.com/planetaryescape/blah.chat/commit/60fe91e009ce38e39717c0ac0cfab2d89f6800a7))
* stabilize desktop build and updater defaults ([00f91cf](https://github.com/planetaryescape/blah.chat/commit/00f91cf01701a6a78ebbed1daf65f3b0aff2c097))
* stabilize iOS mobile chat input focus ([4e920ab](https://github.com/planetaryescape/blah.chat/commit/4e920ab9a5565a0c4b4d7fe73a5818b1e5c7f2dd))

## [1.22.0](https://github.com/planetaryescape/blah.chat/compare/v1.21.0...v1.22.0) (2026-02-06)


### Features

* **api:** harden authz and portable SSE ([3467a01](https://github.com/planetaryescape/blah.chat/commit/3467a014321477240fa8884a25959f6b1b4ecfe1))
* **clients:** migrate clients to SDK transport ([864908c](https://github.com/planetaryescape/blah.chat/commit/864908c29f8957c854c28b0e98f7b5771164bd66))
* **api-client:** add publish-ready typed API client ([002152b](https://github.com/planetaryescape/blah.chat/commit/002152ba3a0c276316d11f5327067efc43cb9a37))


### Bug Fixes

* **ci:** fallback portable check when rg missing ([de77b42](https://github.com/planetaryescape/blah.chat/commit/de77b427ab1d440253b7bd5b04ada88e30b3666a))
* **ci:** handle shallow sdk version check ([998441c](https://github.com/planetaryescape/blah.chat/commit/998441c2931e35f2f60724a97e550eee1306df8e))
* **ci:** stabilize failing PR checks ([cc2412f](https://github.com/planetaryescape/blah.chat/commit/cc2412f40e66e4d8c3be060b60a0e392ca3e70b6))
* **raycast:** relax lint for bun-only workspace ([1f50881](https://github.com/planetaryescape/blah.chat/commit/1f5088133d507159514cc83fbb67f98e570b9d05))

## [1.21.0](https://github.com/planetaryescape/blah.chat/compare/v1.20.1...v1.21.0) (2026-02-06)


### Features

* **cli:** add debug command and fix search query param ([d270926](https://github.com/planetaryescape/blah.chat/commit/d2709268110dac3475c2dc5f06783a56f9a1f029))

## [1.20.1](https://github.com/planetaryescape/blah.chat/compare/v1.20.0...v1.20.1) (2026-02-06)


### Bug Fixes

* **cli:** await async actions and add --api-key login option ([4f67ad9](https://github.com/planetaryescape/blah.chat/commit/4f67ad94fc952171a0841bea552a28683b0421d6))

## [1.20.0](https://github.com/planetaryescape/blah.chat/compare/v1.19.2...v1.20.0) (2026-02-06)


### Features

* add auto router enabled setting with analytics ([efaad60](https://github.com/planetaryescape/blah.chat/commit/efaad60bfa4255f3d41d6b6c97d0c687041ffcc0))


### Bug Fixes

* **ci:** use tab delimiter when parsing gh release list ([f3de5bc](https://github.com/planetaryescape/blah.chat/commit/f3de5bcc41fb8465197bcbe28cdc091db2f28b90))
* **cli:** resolve parser.worker.js from package root ([9882e32](https://github.com/planetaryescape/blah.chat/commit/9882e3231d94bbaa64640590e1754a2a3f45a240))

## [1.19.2](https://github.com/planetaryescape/blah.chat/compare/v1.19.1...v1.19.2) (2026-02-06)


### Bug Fixes

* **cli:** resolve TreeSitter worker path in compiled binary ([247c92c](https://github.com/planetaryescape/blah.chat/commit/247c92cc03b68b9d9b55c82ccc3f5e5b5a8aa429))
* **cli:** use cli-v tag format and remove darwin-x64 ([68dd7ad](https://github.com/planetaryescape/blah.chat/commit/68dd7ad762a3bbb252ea3449872a3fa675edacd6))

## [1.19.1](https://github.com/planetaryescape/blah.chat/compare/v1.19.0...v1.19.1) (2026-02-06)


### Bug Fixes

* **ci:** use draft-then-publish for immutable releases ([8056fc7](https://github.com/planetaryescape/blah.chat/commit/8056fc773a4ec30aa5b02b85ed072e397cf4727f))
* **ci:** use macos-13 for darwin-x64 CLI builds ([#276](https://github.com/planetaryescape/blah.chat/issues/276)) ([801280d](https://github.com/planetaryescape/blah.chat/commit/801280d63addc175130d3637e3e059024e2da087))
* **ci:** use macos-15-large for darwin-x64 CLI builds ([382be1b](https://github.com/planetaryescape/blah.chat/commit/382be1b224d538482c3cd5161e3f2dc28432e2d4))
* validate fallback model and sync pre-created message model ([3692f65](https://github.com/planetaryescape/blah.chat/commit/3692f65e4b590118d993b2cf403fd814df0b542e))

## [1.19.0](https://github.com/planetaryescape/blah.chat/compare/v1.18.3...v1.19.0) (2026-02-05)


### Features

* **cli:** add multi-platform distribution support ([98feff1](https://github.com/planetaryescape/blah.chat/commit/98feff15dfb5da02146f89bd1e47e71ea6019935))


### Bug Fixes

* add autoRouterEnabled and showSlides to preferences schema ([37e7fbb](https://github.com/planetaryescape/blah.chat/commit/37e7fbb6639e4f1561d464ae1c78000a9e70497d))
* **backend:** add missing getUserPreferenceState query ([ba4908d](https://github.com/planetaryescape/blah.chat/commit/ba4908dcca7f9864b92abaf1a2b51531628c70a4))
* **ci:** use macos-15-large for darwin-x64 (macos-13 retired) ([cf707a0](https://github.com/planetaryescape/blah.chat/commit/cf707a0a9bbe7f46bb644f7e262383c46977b5b5))
* **cli:** address PR review issues ([6651ee7](https://github.com/planetaryescape/blah.chat/commit/6651ee7afe5ed735cd7d2129f87083bea0cb2566))
* **cli:** split scoped package name in postinstall path join ([a84c231](https://github.com/planetaryescape/blah.chat/commit/a84c231256576ccde60969967e79205a85dc2f89))
* **cli:** split scoped package name into path segments for join() ([b81c5d6](https://github.com/planetaryescape/blah.chat/commit/b81c5d69ffdb37928f386937c42c273114b28450))
* **install:** use INSTALL_DIR for PATH instead of hardcoded path ([fd2497a](https://github.com/planetaryescape/blah.chat/commit/fd2497afb1a93a7e8c327cce8720936b64f79bd4))
* **test:** add missing get/put mocks to userPreferences cache ([7cbea3f](https://github.com/planetaryescape/blah.chat/commit/7cbea3ff1bbab9c79948d64e8ef98bb15b4b8eae))
* **web:** escape &gt; characters in JSX DialogDescription ([fee5383](https://github.com/planetaryescape/blah.chat/commit/fee5383da3fe9b9fcb37ff671e42eff4a4577c8b))

## [1.18.3](https://github.com/planetaryescape/blah.chat/compare/v1.18.2...v1.18.3) (2026-02-04)


### Bug Fixes

* **ci:** add checkout step to dependabot auto-merge workflow ([5028263](https://github.com/planetaryescape/blah.chat/commit/5028263b9a2e40c46e230d89c66bcfafa082f9a7))
* **cli:** use PowerShell Compress-Archive on Windows ([e086fb1](https://github.com/planetaryescape/blah.chat/commit/e086fb18e1d3ca4b39c48aa11cc6a140368fa787))

## [1.18.2](https://github.com/planetaryescape/blah.chat/compare/v1.18.1...v1.18.2) (2026-02-04)


### Bug Fixes

* **cli:** use native runners for cross-platform builds ([45148d5](https://github.com/planetaryescape/blah.chat/commit/45148d5302307ae0d5c6a5396603d969b80ed1a5))

## [1.18.1](https://github.com/planetaryescape/blah.chat/compare/v1.18.0...v1.18.1) (2026-02-04)


### Bug Fixes

* **cli:** install cross-platform opentui binaries before compile ([917e656](https://github.com/planetaryescape/blah.chat/commit/917e65656379b92bfac1e6cb4b8cb638613d368e))

## [1.18.0](https://github.com/planetaryescape/blah.chat/compare/v1.17.0...v1.18.0) (2026-02-04)


### Features

* **cli:** add release workflow and compile script ([85e1f09](https://github.com/planetaryescape/blah.chat/commit/85e1f09ace8a72d74eb66d0de9181ace3c72c650))
* **cli:** add tree-sitter syntax highlighting support ([e4bc651](https://github.com/planetaryescape/blah.chat/commit/e4bc651c1b7c43c4798151c3db343fbe68cc112d))
* **cli:** improve components for OpenTUI rewrite ([14f5f03](https://github.com/planetaryescape/blah.chat/commit/14f5f035a0b19e698ad3daf9a0297da401cee688))
* **mobile:** add Android project scaffolding ([f5b31e5](https://github.com/planetaryescape/blah.chat/commit/f5b31e5e402156df73014d73335f59a7d2405f5f))
* **mobile:** add bookmark and save-as-note actions to messages ([5ddeedd](https://github.com/planetaryescape/blah.chat/commit/5ddeeddcc168f5f37851d03dfd207bdaacd33c9d))
* **mobile:** add branch navigation UI components ([9513d7e](https://github.com/planetaryescape/blah.chat/commit/9513d7eded13c1c904b93660da8fb7676c238423))
* **mobile:** add drawer navigation with conversation search and project filtering ([748ede0](https://github.com/planetaryescape/blah.chat/commit/748ede0bd3ce3b7e7558502078db04c6fd1a1e79))
* **mobile:** add hooks for bookmarks and notes ([8601c0e](https://github.com/planetaryescape/blah.chat/commit/8601c0eb6e309bd86acf61cc12a317753233410c))
* **mobile:** add hooks for sibling navigation and message actions ([67cd5d9](https://github.com/planetaryescape/blah.chat/commit/67cd5d9c11ea918c8efad69747af0ec14dd4d36f))
* **mobile:** add notes navigation to drawer ([3a90e2b](https://github.com/planetaryescape/blah.chat/commit/3a90e2b81e46bd2e01e70db0cb05ee48fd95d697))
* **mobile:** add notes screens with auto-tag and sharing ([f1b0ba7](https://github.com/planetaryescape/blah.chat/commit/f1b0ba78f1c98e7f517e1698b960465bf17ef377))
* **mobile:** add notes UI components ([abeca6d](https://github.com/planetaryescape/blah.chat/commit/abeca6df76ad12ef28ed2433f9c1f4bba4241071))
* **mobile:** filter messages by active branch ([fedc446](https://github.com/planetaryescape/blah.chat/commit/fedc446ccd8cd7466c192ae315b7340c9f0b38e6))
* **mobile:** integrate branch navigation into message components ([916d976](https://github.com/planetaryescape/blah.chat/commit/916d9762c7986fe44ddf520503290329bfa654af))
* **mobile:** wire up branch actions in chat screen ([2e53ea3](https://github.com/planetaryescape/blah.chat/commit/2e53ea38af1fdf306cbaf6d4d0694c9a6a13cc77))


### Bug Fixes

* **backend:** deactivate descendants when editing message ([fd2ee5f](https://github.com/planetaryescape/blah.chat/commit/fd2ee5fb07f5cfd8659182ebb967b60f0c8db664))
* **backend:** move native deps to optionalDependencies for mobile builds ([e9fad60](https://github.com/planetaryescape/blah.chat/commit/e9fad60c705ff649b4c112c4d18b5418f5d7e13c))
* **backend:** query children by both parentMessageIds and parentMessageId ([e4e92de](https://github.com/planetaryescape/blah.chat/commit/e4e92de1bcb54db8103380da5fe249618c28cbc0))
* **cli:** bind chat input value so it clears after send ([7a0314c](https://github.com/planetaryescape/blah.chat/commit/7a0314c3ec3c5559b08e3143c6fd5c1397d0ee79))
* **cli:** use Bun.build with solid plugin for JSX transform ([5d4de40](https://github.com/planetaryescape/blah.chat/commit/5d4de402e563233aecf62a95a57c812b08927cef))
* configure EAS to use bun install ([91b4abf](https://github.com/planetaryescape/blah.chat/commit/91b4abf447b8122f5e0a885ecc7ecf545a2132a2))
* **mobile:** add eas-build-pre-install hook for bun detection ([44598b1](https://github.com/planetaryescape/blah.chat/commit/44598b1774ff98e9ec8a1d52b52f7708a6a7a83f))
* **mobile:** add eas-build-pre-install to mobile package.json ([f3fd53c](https://github.com/planetaryescape/blah.chat/commit/f3fd53c94b15e56acbacaba9eb61e38e9341bd87))
* **mobile:** add empty bun.lockb for EAS package manager detection ([e3b3187](https://github.com/planetaryescape/blah.chat/commit/e3b318735005b440accf35f3f23a8c3e7510fc94))
* **mobile:** check typeof for optimistic ID detection ([6bdbdaf](https://github.com/planetaryescape/blah.chat/commit/6bdbdafa0bc41348bc403fdbb7ac4d7d99fb8cfd))
* **mobile:** delete lockfile in pre-install to bypass frozen-lockfile ([b10f696](https://github.com/planetaryescape/blah.chat/commit/b10f696c9a21822b74906ac2fe21ca3d09ac41aa))
* **mobile:** include bun.lock in EAS builds for package manager detection ([1954360](https://github.com/planetaryescape/blah.chat/commit/1954360690aece8380a2049d12311c6be59bca4a))
* **mobile:** regenerate bun.lock for EAS frozen lockfile ([8047960](https://github.com/planetaryescape/blah.chat/commit/80479609f0c6b218fd4697953a382b7a65b0d4d5))
* **mobile:** save as note sheet not opening ([8315588](https://github.com/planetaryescape/blah.chat/commit/83155887010d7b8bd450ddb79613749c2829d0bf))
* **mobile:** sync bun version to 1.3.5 across all configs ([2c55cd1](https://github.com/planetaryescape/blah.chat/commit/2c55cd1165a9bf1f9c559f3f60a898a5285db19a))
* **mobile:** transpile bible-passage-reference-parser private class fields ([c85efc3](https://github.com/planetaryescape/blah.chat/commit/c85efc397b1597efe4cd41b255b7ec2b7831bc5e))
* **mobile:** use RNGH TouchableOpacity for drawer gesture compatibility ([1e028e8](https://github.com/planetaryescape/blah.chat/commit/1e028e8aaa651ebc933778563d408650dede7ce1))
* remove invalid install config from eas.json ([16a21e2](https://github.com/planetaryescape/blah.chat/commit/16a21e2cb04ef03888721d97ce1346a8d7c6d78c))


### Performance Improvements

* **mobile:** optimize chat rendering and message deduplication ([520b99b](https://github.com/planetaryescape/blah.chat/commit/520b99b13aa0f9230de58777661758017d010001))

## [1.17.0](https://github.com/planetaryescape/blah.chat/compare/v1.16.0...v1.17.0) (2026-01-28)


### Features

* **mobile:** add rich content rendering to chat messages ([437b03b](https://github.com/planetaryescape/blah.chat/commit/437b03b4d4e994a0a3a475a52c313700be7e201e))
* **mobile:** add syntax highlighting with react-native-code-highlighter ([15c29c7](https://github.com/planetaryescape/blah.chat/commit/15c29c7e17c860e804662e53488233fd9dd520cd))
* **mobile:** full-width assistant messages, compact user bubbles ([c3a19b4](https://github.com/planetaryescape/blah.chat/commit/c3a19b4f1c1c76e3d3faf72d389319ed9791a425))
* **mobile:** haptic feedback when streaming starts ([31f458e](https://github.com/planetaryescape/blah.chat/commit/31f458e1c0db20bba173b62966eee5ca1d8748c2))
* **mobile:** production-quality chat with dark theme and proper ordering ([cfe6188](https://github.com/planetaryescape/blah.chat/commit/cfe618854fad590a8df8da65134b96edbfc3daba))


### Bug Fixes

* **backend:** gracefully handle AI provider errors in title generation ([557a2cf](https://github.com/planetaryescape/blah.chat/commit/557a2cf79fcd32925f084599b2fb340710e51703))
* **backend:** log usage tracking errors in title generation ([df553fd](https://github.com/planetaryescape/blah.chat/commit/df553fd42384e131ee35b85db44d13a3e9db35b0))
* **mobile:** add external browser fallback for Mermaid diagrams ([5e1ee8a](https://github.com/planetaryescape/blah.chat/commit/5e1ee8a5a198d9327177ba7448515114bba21e05))
* **mobile:** address security issues from code review ([de7933e](https://github.com/planetaryescape/blah.chat/commit/de7933e3d00094730a59decaeee978b50ec2dc7e))
* **mobile:** balance user bubble padding (16h x 8v) ([72915eb](https://github.com/planetaryescape/blah.chat/commit/72915eb39cc7297d41462f45fcf3b1f76abe4b5d))
* **mobile:** handle Mermaid CDN failure gracefully ([8abce84](https://github.com/planetaryescape/blah.chat/commit/8abce84840eb593395626cd8e6665c1ba0f640db))
* **mobile:** improve LaTeX detection and fallback rendering ([0b79d8e](https://github.com/planetaryescape/blah.chat/commit/0b79d8e9f7c80cbbb9ac5cbcfa247808f65c8617))
* **mobile:** improve WebView detection and LaTeX fallback ([31ab479](https://github.com/planetaryescape/blah.chat/commit/31ab4794625d9a1448778b8e954d3558bdd9e9d6))
* **mobile:** increase chat text weight to medium ([639f98f](https://github.com/planetaryescape/blah.chat/commit/639f98fdeb75cdcfbffcfe3b6b51dce79a14cf22))
* **mobile:** increase dedup window to 30s for slow networks ([3f64e81](https://github.com/planetaryescape/blah.chat/commit/3f64e81ec8be3dec068acacebc5bed2c92522fdb))
* **mobile:** make Bible verse links inline with Text onPress ([6be6087](https://github.com/planetaryescape/blah.chat/commit/6be6087c2fa3d55714fbbb66b1ede51184bdf1f4))
* **mobile:** match Bible verse link color to web primary ([68535e5](https://github.com/planetaryescape/blah.chat/commit/68535e564e9eddde7b5fee3fe6b64aee54965b71))
* **mobile:** remove console.error in favor of graceful handling ([ab4ef47](https://github.com/planetaryescape/blah.chat/commit/ab4ef477696db0c15d3c6633e10121faa31ebf80))
* **mobile:** remove unused variables in mathProcessor ([a4f92e5](https://github.com/planetaryescape/blah.chat/commit/a4f92e5c1d8a87d46835c9e08bc590e9acd67b2a))
* **mobile:** replace broken syntax highlighter with native code display ([bc1ea5e](https://github.com/planetaryescape/blah.chat/commit/bc1ea5edbc16b4dc6a82b6ae68dfcef5201e0564))
* **mobile:** safely handle WebView native module in Expo Go ([2db784d](https://github.com/planetaryescape/blah.chat/commit/2db784da30a301795626b1c422da8db71b13de12))
* **mobile:** use glass-style user bubble matching web ([f6c47e4](https://github.com/planetaryescape/blah.chat/commit/f6c47e46c135c92c7bf516e27908200ba2cd2f4c))
* **mobile:** use inline hljs style for syntax highlighter ([f484f5d](https://github.com/planetaryescape/blah.chat/commit/f484f5d61121187a03274bd331bc41affbd617c3))
* **mobile:** use primary color for all links in markdown ([31a8413](https://github.com/planetaryescape/blah.chat/commit/31a8413184f8399fa67e127dd7b4ef2b15dbc0d7))
* **web:** increase assistant message font weight to medium ([84b780c](https://github.com/planetaryescape/blah.chat/commit/84b780cb9ce98adc26cf8210011b5c658715139e))
* wrap streamText in try/catch, reset haptic ref on conversation change ([44e8321](https://github.com/planetaryescape/blah.chat/commit/44e8321e074bae932395cc2821fb21620217434d))

## [1.16.0](https://github.com/planetaryescape/blah.chat/compare/v1.15.1...v1.16.0) (2026-01-28)


### Features

* **composio:** curate integrations to 50 high-value services ([2abf0e2](https://github.com/planetaryescape/blah.chat/commit/2abf0e229e8d75a5c5d55e16ebeefef1d963a780))
* **composio:** restore 500+ integrations after OAuth fix ([196ceaa](https://github.com/planetaryescape/blah.chat/commit/196ceaadc8479fa45ec7a56d2f257d45872d5dc3))
* **ui:** add Google service icons for integrations ([9cc4caa](https://github.com/planetaryescape/blah.chat/commit/9cc4caa2edc0434686e2241d63168d49a9227fe0))
* **ui:** add SVG icons for curated integrations ([bb4f74c](https://github.com/planetaryescape/blah.chat/commit/bb4f74c4a36ea1ed7512dc53d86fc8a6aed9c198))


### Bug Fixes

* improve internal tool priority when Composio active ([57911e0](https://github.com/planetaryescape/blah.chat/commit/57911e06ec552525614c85f5fc10378440f20ad5))
* remove unused Buffer import and mapping ([af0c0de](https://github.com/planetaryescape/blah.chat/commit/af0c0def19d5bc83cb06390f2dcd3122b3cf5edc))

## [1.15.1](https://github.com/planetaryescape/blah.chat/compare/v1.15.0...v1.15.1) (2026-01-27)


### Bug Fixes

* **composio:** include CSRF state in OAuth callback URL ([acfde25](https://github.com/planetaryescape/blah.chat/commit/acfde253e34dd1acae93d827d08abbe3cc64feef))

## [1.15.0](https://github.com/planetaryescape/blah.chat/compare/v1.14.0...v1.15.0) (2026-01-27)


### Features

* **models:** add CLI for model management ([9904426](https://github.com/planetaryescape/blah.chat/commit/9904426d2e2a08aa6ce47fe7cf44fa707b1487b3))
* **models:** add Kimi K2.5 to static config for UI ([549c9a8](https://github.com/planetaryescape/blah.chat/commit/549c9a88bbce04ae7d12552c9f3be06f4571b8d2))
* **models:** migrate UI from static MODEL_CONFIG to database ([6fff32f](https://github.com/planetaryescape/blah.chat/commit/6fff32fd5df6be20c87028c96587ec8e9d436a7d))


### Bug Fixes

* address CI failures and PR review comments ([ac17973](https://github.com/planetaryescape/blah.chat/commit/ac17973fdcea28b2eae44fe9bd0db586cc3007f4))
* **composio:** reduce to 10 OAuth integrations for reliability ([dee657b](https://github.com/planetaryescape/blah.chat/commit/dee657b1dd8663acdf7e22812e2885964f72fdf5))
* **models:** run convex CLI from backend directory ([4385e10](https://github.com/planetaryescape/blah.chat/commit/4385e10df1aeb889fd5ec629c9392d33d040936e))

## [1.14.0](https://github.com/planetaryescape/blah.chat/compare/v1.13.0...v1.14.0) (2026-01-27)


### Features

* **admin:** make max active integrations configurable ([7d003c2](https://github.com/planetaryescape/blah.chat/commit/7d003c2da5133ef8749f6f7818ef66a28a74537b))
* **admin:** replace router model select with combobox ([d47e43f](https://github.com/planetaryescape/blah.chat/commit/d47e43f568ff81aedb222181bb9df9ed07ff2cd4))
* **admin:** use select dropdown for router model setting ([da87bdf](https://github.com/planetaryescape/blah.chat/commit/da87bdf14656c1c88a2473f0674be95b14604ccb))
* **composio:** add integrations indicator in chat input ([ebea740](https://github.com/planetaryescape/blah.chat/commit/ebea740883571291ec217ab388ea85b5fd085953))
* **composio:** add svgl icons and improve settings UI ([0cf2bb5](https://github.com/planetaryescape/blah.chat/commit/0cf2bb571c2e9b6591f93a6d8c8ebf4d774aef3f))
* **composio:** improve tools integration and logging ([0778292](https://github.com/planetaryescape/blah.chat/commit/0778292e3b5eb57d607a1e47f1be4a8b1c0cb3de))
* **integrations:** add Composio integration for external service tools ([208d28c](https://github.com/planetaryescape/blah.chat/commit/208d28ca5d4ef45dc123036ae3dfc418b3b436b2))


### Bug Fixes

* **admin:** fix page overflow and scrolling issues ([db14be5](https://github.com/planetaryescape/blah.chat/commit/db14be54f047eb561d1fbc97492ab1717457711f))
* **admin:** wrap ScrollArea properly for correct overflow handling ([f4667cb](https://github.com/planetaryescape/blah.chat/commit/f4667cb14b035dae1d6e0f9667cf7d594c5fb153))
* **composio:** fix Convex runtime and Composio SDK API issues ([6fea169](https://github.com/planetaryescape/blah.chat/commit/6fea169ff2632953a5cbb9604185fcb084cea844))
* **composio:** preserve active status during re-auth to prevent tool access loss ([5bc0943](https://github.com/planetaryescape/blah.chat/commit/5bc0943244ce323bb55fe3a83545739ca03d46e7))
* **composio:** prioritize connectedAccountId param, add verification note ([de7060a](https://github.com/planetaryescape/blah.chat/commit/de7060a562a665277b8b35a546506123a4ed6098))
* **security:** address critical OAuth vulnerabilities ([a7d6485](https://github.com/planetaryescape/blah.chat/commit/a7d648540f6493c2632fd481fc422ba079c061d5))
* **security:** hardcode production domain for postMessage origin ([0c32693](https://github.com/planetaryescape/blah.chat/commit/0c326930414dff497bc81eed2f71902c6f43ee2c))
* **security:** strengthen CSRF and XSS protections ([f726e26](https://github.com/planetaryescape/blah.chat/commit/f726e26a7856685fcddd23700ceb19b8556d6e99))
* **settings:** sticky tabs and pending connection UX ([0029987](https://github.com/planetaryescape/blah.chat/commit/00299871805b67b46970b49d6f578d3d1ef7ef7d))
* **ui:** improve tool call display and integrations list ([37fc858](https://github.com/planetaryescape/blah.chat/commit/37fc8581591e7e55b24a1b4bfa53013a2e726324))

## [1.13.0](https://github.com/planetaryescape/blah.chat/compare/v1.12.1...v1.13.0) (2026-01-27)


### Features

* **ai:** add currency converter tool ([d34f493](https://github.com/planetaryescape/blah.chat/commit/d34f4933465c0e731ba3a250ac59b40c7fec8acd))


### Bug Fixes

* **ai:** correct Frankfurter API endpoint and add response typing ([0a86ac0](https://github.com/planetaryescape/blah.chat/commit/0a86ac00921109a0bf0c0f083fb0eb6ef887a1bb))
* **ai:** use URLSearchParams and add 10s timeout for currency converter ([524df55](https://github.com/planetaryescape/blah.chat/commit/524df552fe9b54a4d3d22b1b82ce0982ecafa7ee))

## [1.12.1](https://github.com/planetaryescape/blah.chat/compare/v1.12.0...v1.12.1) (2026-01-26)


### Bug Fixes

* **generation:** calculate TPS using pure API wait time ([46354b9](https://github.com/planetaryescape/blah.chat/commit/46354b99647351a8f5d59f2bd96ce50b2356497c))
* **generation:** include tool-call chunks in TPS wait time ([3376aa3](https://github.com/planetaryescape/blah.chat/commit/3376aa3d5ec12080904bcc1fe12b01351f017c5b))

## [1.12.0](https://github.com/planetaryescape/blah.chat/compare/v1.11.0...v1.12.0) (2026-01-26)


### Features

* **admin:** add models and auto-router admin UI ([2b90b8b](https://github.com/planetaryescape/blah.chat/commit/2b90b8b26409549e04976b0e47ef63bbc749526e))
* **models:** add database-backed model management ([325cb99](https://github.com/planetaryescape/blah.chat/commit/325cb996cbe076ab621f4c36bbbdcdee86b05b00))


### Bug Fixes

* **admin:** address code review feedback ([7d5ab1c](https://github.com/planetaryescape/blah.chat/commit/7d5ab1c2e1a99a31a76016a3f64998e6a14c0398))
* **admin:** replace native confirm() with AlertDialog ([64967d6](https://github.com/planetaryescape/blah.chat/commit/64967d6d0d7b0602deed314c6f861190af888dae))
* **admin:** replace native dialogs with shadcn components ([6e19bd8](https://github.com/planetaryescape/blah.chat/commit/6e19bd8f7f267e64fefc00bdf30f41309fbd70ba))
* **chat:** prevent toolbar buttons from triggering form submission ([808a221](https://github.com/planetaryescape/blah.chat/commit/808a2211f18f0229be0229a2697572096d652677))
* **models:** cascade delete profiles and safe JSON parsing ([b6b5c4d](https://github.com/planetaryescape/blah.chat/commit/b6b5c4d313ec7bf27c4a7f86db200c76067ccdd8))
* **models:** fallback to static config when DB is empty ([ae36f2a](https://github.com/planetaryescape/blah.chat/commit/ae36f2ab44bdb0c76cae44681c09fd9d91918202))
* **router:** improve high-stakes topic detection for medical advice ([2627316](https://github.com/planetaryescape/blah.chat/commit/262731686a785ea3df1e1b6c3b1aa0a6a1813acc))
* **security:** add admin authorization to admin-only model queries ([547113c](https://github.com/planetaryescape/blah.chat/commit/547113c6931668b44b2af8e2a75a627e5687cfb5))
* **security:** add input validation for model IDs ([e3eb676](https://github.com/planetaryescape/blah.chat/commit/e3eb676ac3cd851ab05ad056af4a9c0f9d9d0054))

## [1.11.0](https://github.com/planetaryescape/blah.chat/compare/v1.10.0...v1.11.0) (2026-01-26)


### Features

* **auto-router:** add sticky routing fields to classification schema ([c8dc591](https://github.com/planetaryescape/blah.chat/commit/c8dc591774a745b42b3d1c6604df45eef3a9f0d4))
* **auto-router:** build dynamic classification prompt with previous model context ([73df0a7](https://github.com/planetaryescape/blah.chat/commit/73df0a7078ddda5a3cbb188ff237f7c47b679481))
* **auto-router:** implement sticky routing with early exit ([0539dba](https://github.com/planetaryescape/blah.chat/commit/0539dbad94a41e72c4e4b712c46dc8c920060d23))
* **chat:** display sticky routing indicator in message stats ([6409bbb](https://github.com/planetaryescape/blah.chat/commit/6409bbbd08510c5ac5d2158032e0fe816ffabd6a))
* **generation:** propagate isSticky field through generation pipeline ([669374a](https://github.com/planetaryescape/blah.chat/commit/669374a596fb5285dc97d5fadca8f7d7279e5d0f))


### Bug Fixes

* **auto-router:** validate capabilities before sticky routing ([21399c0](https://github.com/planetaryescape/blah.chat/commit/21399c049f31506de5ddd17ab4d7f3ac06f811de))
* **conversations:** resolve bulk delete byte limit error ([3ada05d](https://github.com/planetaryescape/blah.chat/commit/3ada05d17e74a00eb0c8550e66c34b50ae6e8268))

## [1.10.0](https://github.com/planetaryescape/blah.chat/compare/v1.9.4...v1.10.0) (2026-01-25)


### Features

* **share:** add dynamic OG metadata to share pages ([f98494d](https://github.com/planetaryescape/blah.chat/commit/f98494d76f6ef698767a6145ef60f303c3931fc1))
* **shares:** add server-side metadata fetcher for OG tags ([ef05c36](https://github.com/planetaryescape/blah.chat/commit/ef05c36157990cf27fc3d4722b3684daf3673c67))

## [1.9.4](https://github.com/planetaryescape/blah.chat/compare/v1.9.3...v1.9.4) (2026-01-24)


### Bug Fixes

* **markdown:** remove rehypeSanitize blocking bible:// links ([7792a2e](https://github.com/planetaryescape/blah.chat/commit/7792a2e4bd4ac48896ac129c918eaf519feb3504))

## [1.9.3](https://github.com/planetaryescape/blah.chat/compare/v1.9.2...v1.9.3) (2026-01-24)


### Bug Fixes

* **markdown:** allow bible:// protocol in rehype-harden ([d458222](https://github.com/planetaryescape/blah.chat/commit/d458222af0c1486e3488a73d9c7dbd9d0673ba1e))

## [1.9.2](https://github.com/planetaryescape/blah.chat/compare/v1.9.1...v1.9.2) (2026-01-24)


### Bug Fixes

* **shares:** show expired state instead of not found for expired shares ([96c8c89](https://github.com/planetaryescape/blah.chat/commit/96c8c89e4054744861123d647c6a42c25e0cea2f))

## [1.9.1](https://github.com/planetaryescape/blah.chat/compare/v1.9.0...v1.9.1) (2026-01-24)


### Bug Fixes

* allow bible:// protocol in Streamdown link safety ([7e85358](https://github.com/planetaryescape/blah.chat/commit/7e85358aa77744927ac33ca1182f8d6611736633))

## [1.9.0](https://github.com/planetaryescape/blah.chat/compare/v1.8.2...v1.9.0) (2026-01-24)


### Features

* **backend:** add enableModelRecommendations user preference ([5397ac5](https://github.com/planetaryescape/blah.chat/commit/5397ac55e7ccdb535ebfaf0bb5ed89b143a4edf4))
* **web:** add UI controls for model recommendations preference ([01c08f5](https://github.com/planetaryescape/blah.chat/commit/01c08f56216ff875908285d57e9575405e6bfa73))


### Bug Fixes

* **mobile:** resolve React version mismatch and remove Moti ([fff65a8](https://github.com/planetaryescape/blah.chat/commit/fff65a8c5d66950b6417663f916e063aeb6aa6e7))

## [1.8.2](https://github.com/planetaryescape/blah.chat/compare/v1.8.1...v1.8.2) (2026-01-22)


### Bug Fixes

* **chat:** improve mobile UX for input focus and message display ([56cfa79](https://github.com/planetaryescape/blah.chat/commit/56cfa795063458f3fda937cb85de01b6e8fa42d6))

## [1.8.1](https://github.com/planetaryescape/blah.chat/compare/v1.8.0...v1.8.1) (2026-01-21)


### Bug Fixes

* **memory:** prevent timer leaks in TTS and copy handlers ([d82834f](https://github.com/planetaryescape/blah.chat/commit/d82834fc1e33d0c253abf412803ad0d27ef29acc))

## [1.8.0](https://github.com/planetaryescape/blah.chat/compare/v1.7.2...v1.8.0) (2026-01-21)


### Features

* **chat:** add web worker for markdown parsing ([bbe90d1](https://github.com/planetaryescape/blah.chat/commit/bbe90d1caaaef7a13a43bfa9a6c299df1c795845))


### Bug Fixes

* add null guard instead of type assertion for stableCode ([e89a4d7](https://github.com/planetaryescape/blah.chat/commit/e89a4d7504479cef5c0d93cf85229b433e916ae5))
* capture stableCode in closure to prevent async race conditions ([63627fd](https://github.com/planetaryescape/blah.chat/commit/63627fd9d78c97bbbee6decf8ae3b1cfb5c74abf))
* **chat:** debounce mermaid rendering to prevent streaming errors ([e7a380a](https://github.com/planetaryescape/blah.chat/commit/e7a380adad794cd63b52c6446ce85d6c01d4381f))
* **security:** move DOMPurify sanitization to main thread ([38ced16](https://github.com/planetaryescape/blah.chat/commit/38ced166f1c7e2819b51f9576b796d7901ba2d43))
* **ui:** prevent iOS Safari auto-zoom on input focus ([ddb6b70](https://github.com/planetaryescape/blah.chat/commit/ddb6b70b02a10f3c7ab86aa3b56698ea400cfcd7))

## [1.7.2](https://github.com/planetaryescape/blah.chat/compare/v1.7.1...v1.7.2) (2026-01-20)


### Bug Fixes

* **chat:** extract conversationId from branchFromMessage result ([dbe738f](https://github.com/planetaryescape/blah.chat/commit/dbe738faf261799901ed9a0f153d613f5b905f52))


### Performance Improvements

* extract sortedCalls to separate useMemo in InlineToolCallContent ([07a6b00](https://github.com/planetaryescape/blah.chat/commit/07a6b00e8fb99dfabe2e8da48a26b8ce7a0b321b))

## [1.7.1](https://github.com/planetaryescape/blah.chat/compare/v1.7.0...v1.7.1) (2026-01-20)


### Bug Fixes

* **chat:** use padding instead of margin for Virtuoso height measurement ([9a6d130](https://github.com/planetaryescape/blah.chat/commit/9a6d130c184b5936397d986361ff44a918d6c6af))

## [1.7.0](https://github.com/planetaryescape/blah.chat/compare/v1.6.0...v1.7.0) (2026-01-20)


### Features

* **tree:** add context, descendants, and subtree deactivation helpers ([1f9c854](https://github.com/planetaryescape/blah.chat/commit/1f9c85466ac5fd359e47b6f494cd5b05d16fb6bf))


### Bug Fixes

* **tree:** ensure deactivateSubtree patches undefined isActiveBranch values ([75b19b9](https://github.com/planetaryescape/blah.chat/commit/75b19b9362e184b0f9894f35d90b314291f195ad))
* **tree:** prevent duplicate IDs in BFS traversal for DAG with multi-parent nodes ([3375c60](https://github.com/planetaryescape/blah.chat/commit/3375c609cb0cbef0ab58a117fa9f9cbffcbfdebc))

## [1.6.0](https://github.com/planetaryescape/blah.chat/compare/v1.5.0...v1.6.0) (2026-01-20)


### Features

* **hooks:** add useBranchComparison hook for branch state management ([0030646](https://github.com/planetaryescape/blah.chat/commit/003064672c54aa5aa5624d0e213368baedbdbb35))
* **ui:** add BranchComparisonSheet for side-by-side version comparison ([473e16c](https://github.com/planetaryescape/blah.chat/commit/473e16c0d69264b7e178a1d4162b68af8412d3f0))
* **ui:** add compare button to MessageBranchIndicator ([de0c696](https://github.com/planetaryescape/blah.chat/commit/de0c69623452aef23e3ef7ff068873494eeb1593))

## [1.5.0](https://github.com/planetaryescape/blah.chat/compare/v1.4.0...v1.5.0) (2026-01-20)


### Features

* **a11y:** add accessibility analytics events ([952157c](https://github.com/planetaryescape/blah.chat/commit/952157cde8acce36ba5367a4883e8d25dcfdf755))
* **a11y:** add accessibility preference schema and defaults ([262010e](https://github.com/planetaryescape/blah.chat/commit/262010e31b6c37f67c8c5282172249384cec0982))
* **a11y:** add accessibility settings UI ([903b788](https://github.com/planetaryescape/blah.chat/commit/903b7885715bc2102100a75472d78d1df8bae621))
* **a11y:** add hook to apply accessibility classes to DOM ([43682e4](https://github.com/planetaryescape/blah.chat/commit/43682e459da641e0447ee53041c5eac06bda2190))
* **a11y:** add keyboard navigation with vim-style shortcuts ([60d757c](https://github.com/planetaryescape/blah.chat/commit/60d757c980fc813613cf58d0b4e12e7e898e408b))
* **a11y:** add MotionProvider for reduced motion support ([c369bfc](https://github.com/planetaryescape/blah.chat/commit/c369bfcae32c3824e029d9334c4f05e3a2c77b94))
* **a11y:** add semantic HTML accessibility improvements ([730756d](https://github.com/planetaryescape/blah.chat/commit/730756d176194b37423a9af2ef6bc8699cd4e3fd))
* **a11y:** add WCAG-compliant CSS for high contrast and text scaling ([bb326fd](https://github.com/planetaryescape/blah.chat/commit/bb326fd69344f6ce41fd0dfa605d2a6a43cec579))
* **a11y:** implement focus management for WCAG 2.4.3/2.4.7 compliance ([0403c93](https://github.com/planetaryescape/blah.chat/commit/0403c93b4ee14bb3b10ae15edabcf1208c2b8e5a))
* **auto-router:** add high-stakes topic detection ([3c75b08](https://github.com/planetaryescape/blah.chat/commit/3c75b08fd483ef3153a53c94daf785cf46338800))
* **backend:** add tree architecture migration script ([21c0819](https://github.com/planetaryescape/blah.chat/commit/21c0819870126a40646995099ad106cf3e54176f))
* **backend:** add tree queries and update message creation for P7 ([c4f5376](https://github.com/planetaryescape/blah.chat/commit/c4f5376370b9c5b1aa3bfd67f1755d871f4476c8))
* **backend:** add tree traversal utilities for message architecture ([4d78b63](https://github.com/planetaryescape/blah.chat/commit/4d78b63f4449a0ccff070b2bd44dc2a2b6583261))
* **backend:** filter messages by active branch in getConversationMessages ([65e38af](https://github.com/planetaryescape/blah.chat/commit/65e38afc095d31a28e74fcf9d68c4a16e92ced22))
* **backend:** update chat mutations for tree-based branching (P7) ([ead2dff](https://github.com/planetaryescape/blah.chat/commit/ead2dff6298cbdf4c46bde53d98b95b4a8e6c2b3))
* **cache:** update Dexie schema v5 for tree architecture ([4cc4c9e](https://github.com/planetaryescape/blah.chat/commit/4cc4c9eb8e098d752142f0fdf29a41a69f2bdcaf))
* **hooks:** add tree data cache sync hooks ([7a0ee1e](https://github.com/planetaryescape/blah.chat/commit/7a0ee1eda0d4581878251c30bea49a0ce65b998a))
* **schema:** add tree-based message architecture fields (P7) ([963da4f](https://github.com/planetaryescape/blah.chat/commit/963da4f5ef45ebc52ccd63db12b44430777e9b8b))
* **ui:** add branch navigation components for tree architecture ([5d8ef53](https://github.com/planetaryescape/blah.chat/commit/5d8ef53c34467f47597b946b900cbe34cd8ef28a))


### Bug Fixes

* **a11y:** add fallback defaults for a11y preferences ([079b1cd](https://github.com/planetaryescape/blah.chat/commit/079b1cd10fae21e65217d134a668b89e48757c1d))
* **a11y:** address PR review feedback ([8a937ea](https://github.com/planetaryescape/blah.chat/commit/8a937ea008528629f3b4521164cac3815bddb7af))
* **a11y:** address PR review feedback ([134ccfa](https://github.com/planetaryescape/blah.chat/commit/134ccfa9bff0721eb357dabd816487dcde263d51))
* **a11y:** address PR review feedback ([728044d](https://github.com/planetaryescape/blah.chat/commit/728044dc91bf0db988adacb1e70428b1cb901246))
* **a11y:** combine effects to avoid classList race condition ([dce12a2](https://github.com/planetaryescape/blah.chat/commit/dce12a241e5d249e749097eda0c6fb58ec7213c4))
* **a11y:** remove unused return from side-effect hook ([b46e66d](https://github.com/planetaryescape/blah.chat/commit/b46e66dd3d9efd2179b599f826fc8dddaa6b20f1))
* add high-stakes fields to routing decision validators ([eb3240e](https://github.com/planetaryescape/blah.chat/commit/eb3240e25109936b6b105c517325e25b5680d1b4))
* address code review feedback ([6fbb3dd](https://github.com/planetaryescape/blah.chat/commit/6fbb3dd023d18bb5ba3ce58971a4e536793fccff))
* handle missing premium models for high-stakes queries ([fe6d2f5](https://github.com/planetaryescape/blah.chat/commit/fe6d2f583b639af90755f36c96cca190ba00da05))
* make isHighStakes optional for backward compatibility ([443d615](https://github.com/planetaryescape/blah.chat/commit/443d6155b2dc62c79ba5040fb3369e1175d342a3))

## [1.4.0](https://github.com/planetaryescape/blah.chat/compare/v1.3.0...v1.4.0) (2026-01-19)


### Features

* **backend:** add hapticFeedbackEnabled preference ([1d0f2ef](https://github.com/planetaryescape/blah.chat/commit/1d0f2ef70692e30101c748239479633365d6eeb5))
* **chat:** integrate haptic feedback on send, copy, stop, delete ([a7f2533](https://github.com/planetaryescape/blah.chat/commit/a7f25335bc7b373488a8b1fba446c10c1bb1c422))
* **hooks:** add useHaptic hook ([a92ea1d](https://github.com/planetaryescape/blah.chat/commit/a92ea1d6146d38303f89b3c16eeb93444bef3883))
* **lib:** add haptic feedback utility ([cbe061c](https://github.com/planetaryescape/blah.chat/commit/cbe061cd2ce4e14ab289ef24bd4b87697cfcae71))
* **settings:** add haptic feedback toggle to UI settings ([841346f](https://github.com/planetaryescape/blah.chat/commit/841346fddd28da26c0440f910f86d386320602b1))
* **settings:** wire hapticFeedbackEnabled to settings state ([89bc0b6](https://github.com/planetaryescape/blah.chat/commit/89bc0b67c1ab57810eaf3ed9cce79d6bbb677e8f))

## [1.3.0](https://github.com/planetaryescape/blah.chat/compare/v1.2.0...v1.3.0) (2026-01-19)


### Features

* **chat:** add StatusTimeline for tool execution progress ([b1aecad](https://github.com/planetaryescape/blah.chat/commit/b1aecad1f5a444d9aa3b640303f0cdd2e39b7617))
* **chat:** add useHoverIntent hook for delayed hover states ([cbeaf2a](https://github.com/planetaryescape/blah.chat/commit/cbeaf2ad888a039bb1aab98b3f65e954529d7cfe))
* **chat:** apply hover delay to message action menus ([c12ae32](https://github.com/planetaryescape/blah.chat/commit/c12ae327d2f480dd3e45303d8fff0c177151bbca))
* **chat:** enhance typing indicator with model name ([262e4aa](https://github.com/planetaryescape/blah.chat/commit/262e4aa4f87792e663c2d9d4f08efc299a8d387a))
* **chat:** integrate StatusTimeline in AI messages ([244354d](https://github.com/planetaryescape/blah.chat/commit/244354dd5d9b3b199da1a7bbb7a2bb7f0c42562f))


### Bug Fixes

* **chat:** graceful StatusTimeline exit animation and aria-busy string ([129911c](https://github.com/planetaryescape/blah.chat/commit/129911c136e220d4732d84504bb11f880bf324d4))

## [1.2.0](https://github.com/planetaryescape/blah.chat/compare/v1.1.0...v1.2.0) (2026-01-19)


### Features

* **a11y:** bypass stream buffering when reduced motion preferred ([5233920](https://github.com/planetaryescape/blah.chat/commit/52339207b6a71c954412ddd3e43ea8f24c750465))
* **chat:** add lock check and acquisition in sendMessage ([83dcae2](https://github.com/planetaryescape/blah.chat/commit/83dcae29325956f19d7bd388d2983776d217e452))
* **generation:** add generation lock utility module ([af896b6](https://github.com/planetaryescape/blah.chat/commit/af896b6313b7516929ebd105746dd12bb2d926e7))
* **generation:** release lock on completion, stop, and error ([9cdbe0c](https://github.com/planetaryescape/blah.chat/commit/9cdbe0c10f04239d550f0b91bccf5bfc1ef348f6))
* **recovery:** integrate lock release with stuck message recovery ([921acc4](https://github.com/planetaryescape/blah.chat/commit/921acc4b1b42f6188893de81b0d43ca8d6251710))
* **schema:** add generationLocks table for concurrent generation prevention ([4965cd1](https://github.com/planetaryescape/blah.chat/commit/4965cd1bb8af32a18a6f7c147e8becf974dac1fc))
* **streaming:** add buffer state tracking to useStreamBuffer ([965758b](https://github.com/planetaryescape/blah.chat/commit/965758b38fd0e14da7be48370dc0519f3638b54d))
* **streaming:** add subtle fade animation for streaming text ([602b244](https://github.com/planetaryescape/blah.chat/commit/602b2448b161bccea24d998955188001e0739a53))


### Bug Fixes

* add lock release on message creation failure and improve stale cleanup ([fa9110f](https://github.com/planetaryescape/blah.chat/commit/fa9110f92a43040770a2689bba94824f6a060398))
* address code review feedback for generation lock ([41278f4](https://github.com/planetaryescape/blah.chat/commit/41278f42fcbc86e6eb3150c1627392c934b4a13d))
* extend try/catch to cover scheduler calls for belt-and-suspenders safety ([9b826c0](https://github.com/planetaryescape/blah.chat/commit/9b826c08e24c8d52d7667b6fcb18cf583fe20200))
* **generation:** cleanup partial tool calls on error paths ([c9b7e85](https://github.com/planetaryescape/blah.chat/commit/c9b7e8598deac39b4a3c2f4a2773cace4ca34c26))
* move markError before releaseLock to prevent stuck state ([285c077](https://github.com/planetaryescape/blah.chat/commit/285c0772823f808b00f0534f3b4193f3675019e6))
* release lock in test between consecutive sends ([fcb6e26](https://github.com/planetaryescape/blah.chat/commit/fcb6e26be30a1199c31ac063ef9c5a4a3c7fc317))
* remove early lock check, fix atomicity comment ([a7fe8c6](https://github.com/planetaryescape/blah.chat/commit/a7fe8c6549087c4820f863f2b37848d6c75dbf34))
* remove lock refresh in cleanup - let stuck message recovery handle it ([9f26569](https://github.com/planetaryescape/blah.chat/commit/9f26569352353ff44401f2248e9337680cc553d9))

## [1.1.0](https://github.com/planetaryescape/blah.chat/compare/v1.0.1...v1.1.0) (2026-01-18)


### Features

* **input:** auto-convert large pastes to file attachments ([198227c](https://github.com/planetaryescape/blah.chat/commit/198227cfd600299556753512c3f3b9b4e2c34857))
* persist unsent message drafts in sessionStorage ([69a44df](https://github.com/planetaryescape/blah.chat/commit/69a44dff54d326a0b23e3c2e311c6dec8ff4aa8f))


### Bug Fixes

* always set input on conversation switch to clear stale text ([97eae48](https://github.com/planetaryescape/blah.chat/commit/97eae48790314e2cbd8ba22bb446dc5cd2a50f9d))
* **input:** prevent Enter submission during IME composition ([e0f89bc](https://github.com/planetaryescape/blah.chat/commit/e0f89bc5126b19e6b46b891fbe8bcead28930f52))
* read textarea.value to avoid race condition in insertTextAtCursor ([b9d55c3](https://github.com/planetaryescape/blah.chat/commit/b9d55c3369ce04492a5f8de8c9bca41db4f16caa))
* remove underscore prefix from isComposing variable ([81ac605](https://github.com/planetaryescape/blah.chat/commit/81ac60510d01a147ac27b335ead858594a5cd957))

## [1.0.1](https://github.com/planetaryescape/blah.chat/compare/v1.0.0...v1.0.1) (2026-01-18)


### Bug Fixes

* add Bun setup to Vercel deploy workflow ([efad8e0](https://github.com/planetaryescape/blah.chat/commit/efad8e0f77620628cd90a05da4dd6c311d1de5ca))

## 1.0.0 (2026-01-18)


### Features

* add copy action to selection context menu ([3ff585e](https://github.com/planetaryescape/blah.chat/commit/3ff585e1677f661a3f648d179f64a9381935b616))
* add Mermaid auto-fix for LLM-generated syntax errors ([a622ac0](https://github.com/planetaryescape/blah.chat/commit/a622ac0930d644d0d3f24dfb50c6e52956977a75))
* **admin:** display error context in feedback detail ([3daecd1](https://github.com/planetaryescape/blah.chat/commit/3daecd17595f043b247fbb6ca8c996e783f77145))
* **ai:** export model configs for mobile app consumption ([9e16342](https://github.com/planetaryescape/blah.chat/commit/9e16342d1372cb576459d43ab5cb7aa21d3c505f))
* **assistant:** add meeting extraction for tasks and notes ([79f5028](https://github.com/planetaryescape/blah.chat/commit/79f5028edcb9cae8b8af3d5628a8ace5a4dfbb0a))
* **backend:** add admin alerting for generation failures ([9d43820](https://github.com/planetaryescape/blah.chat/commit/9d43820c1c0b8043240bfbdec2f35cc9a5df7cd2))
* **backend:** add auto-router error recovery with retry logic ([afe6f5a](https://github.com/planetaryescape/blah.chat/commit/afe6f5a871311c9ead83611a36390d796051d84a))
* **backend:** add cascadeDeleteUserData for GDPR data deletion ([50118de](https://github.com/planetaryescape/blah.chat/commit/50118de47bdd7a5958b6a33d3168c88cd745f180))
* **backend:** add CLI API key authentication ([c735a53](https://github.com/planetaryescape/blah.chat/commit/c735a53e72b0c39370e87c676bf9bebafba61631))
* **backend:** add GDPR data export and deletion mutations ([07a7249](https://github.com/planetaryescape/blah.chat/commit/07a72496deae12e926ab6f877752ed6db39b77a5))
* **backend:** add message recovery for stuck generating messages ([5c579e1](https://github.com/planetaryescape/blah.chat/commit/5c579e13e93589bf3fb7599db1fd9dbc11a5d244)), closes [#132](https://github.com/planetaryescape/blah.chat/issues/132)
* **backend:** add structured logging with logger utility ([074c1fd](https://github.com/planetaryescape/blah.chat/commit/074c1fdb66b0f70e04761736a4fdd2d7471618c2)), closes [#130](https://github.com/planetaryescape/blah.chat/issues/130)
* **backend:** add triggerAutoRename action ([afd067f](https://github.com/planetaryescape/blah.chat/commit/afd067f444eaffed41f18960ab5d4756c5df22c2))
* **backend:** add triggerAutoRename action ([1ff0ef0](https://github.com/planetaryescape/blah.chat/commit/1ff0ef076997db8f2580091fa67ab328777b08fd))
* **bookmarks:** improve card layout and strip markdown from previews ([9bef000](https://github.com/planetaryescape/blah.chat/commit/9bef000b46b01cc4840dc9991531029fa5c4a783))
* **budget:** add tool timeout utilities ([b2d7e3a](https://github.com/planetaryescape/blah.chat/commit/b2d7e3a31df5d92ef7ee56e442bb52c18b9d3568))
* **budget:** add tool timeout utilities ([d7e7c1c](https://github.com/planetaryescape/blah.chat/commit/d7e7c1c4c9790401d4d2b04fa824209dd7d379f7))
* **byod:** add automated deployment pipeline for BYOD instances ([d9aacf9](https://github.com/planetaryescape/blah.chat/commit/d9aacf9e4f1038f2085fb8bf16896272368a36a3))
* **byok:** add backend credential management ([d3031d4](https://github.com/planetaryescape/blah.chat/commit/d3031d48499e9f21396d77caea052463b7208914))
* **cache:** add Dexie local-first cache for instant reads ([a9b3aca](https://github.com/planetaryescape/blah.chat/commit/a9b3acac617b5193f5c97ff5c7bd81493e2e0273))
* **cache:** add Dexie preferences cache for instant reads ([42a61c4](https://github.com/planetaryescape/blah.chat/commit/42a61c4c4bc0d4184d1d9190fda71615209014c6))
* **cache:** add Dexie preferences cache for instant reads ([ff31f84](https://github.com/planetaryescape/blah.chat/commit/ff31f84e3602001eb88790f7ae8d38fcb29b815b))
* **cache:** complete local-first for notes, tasks, projects ([8c00a59](https://github.com/planetaryescape/blah.chat/commit/8c00a5941bd3b510bf971c0f2462d75892f0037d))
* **chat:** add Bible verse detection and hover preview ([5a97c44](https://github.com/planetaryescape/blah.chat/commit/5a97c44e6b8c811ceabf8738adbbb8d9575be8ee))
* **chat:** add context limit enforcement hook and compact dialog ([993ee7e](https://github.com/planetaryescape/blah.chat/commit/993ee7e8a1dc1a043180fda27f8b9dab8a66bf61))
* **chat:** add Safari fallback for scroll anchoring ([a0db0db](https://github.com/planetaryescape/blah.chat/commit/a0db0db0748d30f33bbde08fffdc296f984dafd7))
* **chat:** add stop recording button for preview mode ([c604e8c](https://github.com/planetaryescape/blah.chat/commit/c604e8c529fc805ef52c974a424ecba61cb00420))
* **chat:** add stop recording button for preview mode ([23306d9](https://github.com/planetaryescape/blah.chat/commit/23306d9ac16803f4cafe7568d7d5e2230b452403))
* **chat:** block model switch when context exceeds limit ([383f4dc](https://github.com/planetaryescape/blah.chat/commit/383f4dc40a563a18c8578e7343104c60f8fe2b48))
* **chat:** improve message UI and add quick model switcher ([dce0685](https://github.com/planetaryescape/blah.chat/commit/dce06855001898fb263f635daade086f6c49d379))
* **chat:** integrate context limit modal and auto-compress ([05dff04](https://github.com/planetaryescape/blah.chat/commit/05dff0415dc4c662078e260052f51013284f9150))
* **ci:** migrate to tag-based deployments with release-please ([11c6b8e](https://github.com/planetaryescape/blah.chat/commit/11c6b8e32780740fcead840627f7dd0d407520a7))
* **cli:** add TUI chat client ([11877fc](https://github.com/planetaryescape/blah.chat/commit/11877fc1bb2a2919910302c32f9b2ebbd790505d))
* **conversations:** add compaction action ([b8830d3](https://github.com/planetaryescape/blah.chat/commit/b8830d38425f0d81241389d70c73f2c72cdabc86))
* **conversations:** export compact module and add autoCompressContext preference ([38b52c5](https://github.com/planetaryescape/blah.chat/commit/38b52c520d508c5d2410e1902953cc231a4583c6))
* couple of mermaid rendering improvement like size and theming ([346371c](https://github.com/planetaryescape/blah.chat/commit/346371c78fed101ea00837ccb5204afa0291609f))
* couple of mermaid rendering improvement like size and theming ([9aa0ab6](https://github.com/planetaryescape/blah.chat/commit/9aa0ab65dcd33cf647b8a3e92df64f55a70b4c40))
* **generation:** add budget tracking and increase tool step limit ([1e3ecfe](https://github.com/planetaryescape/blah.chat/commit/1e3ecfe250d5880ce1dbccfd80e486c20bfd2bb0))
* **generation:** add budget tracking and increase tool step limit ([1651dab](https://github.com/planetaryescape/blah.chat/commit/1651dab9a8646cde576c6234bfbfa4321675fd84))
* **generation:** add Phase 3 tool call safeguards ([f2a15ad](https://github.com/planetaryescape/blah.chat/commit/f2a15ad758ad31fa3522184cae79b8f00136f7ea))
* **generation:** add Phase 3 tool call safeguards ([e814fba](https://github.com/planetaryescape/blah.chat/commit/e814fba3a1dde8a7a9fe661e68d49339947ea684))
* **generation:** inject askForClarification nudge when stuck ([ec6feab](https://github.com/planetaryescape/blah.chat/commit/ec6feab9a2b88bb91c5d8883a5b525901fc27eb8))
* **generation:** inject askForClarification nudge when stuck ([45668f5](https://github.com/planetaryescape/blah.chat/commit/45668f55343ab7ab30d7768a5f2e9bd8b863f485))
* **hooks:** extend useApiKeyValidation for BYOK ([fd7cfff](https://github.com/planetaryescape/blah.chat/commit/fd7cfff48e40e0cb192e1d4137e92e3a981040ca))
* **knowledge:** add Gemini 2.0 Flash fallback for YouTube transcripts ([6da379c](https://github.com/planetaryescape/blah.chat/commit/6da379c5167c2112e01666dac86703d2fde6f9d6))
* **knowledge:** add Gemini 2.0 Flash fallback for YouTube transcripts ([f5d5269](https://github.com/planetaryescape/blah.chat/commit/f5d5269fcecbe4c7f327891e4042f660fdea2328))
* **knowledge:** add Knowledge Bank for document/web/video RAG ([71164ed](https://github.com/planetaryescape/blah.chat/commit/71164ed92d32f9b52438b7bc9a32a4e4f6bc4242))
* **landing:** rework marketing page for cloud offering ([2fcee0a](https://github.com/planetaryescape/blah.chat/commit/2fcee0a5be3f408e1487f2410749f96b1f8e262b))
* **memories:** add multi-select, batch delete, merge selected ([bb611d8](https://github.com/planetaryescape/blah.chat/commit/bb611d80ada3e84ba56052f548e9fedc13fcaede))
* **memories:** add multi-select, batch delete, merge selected ([4455cd1](https://github.com/planetaryescape/blah.chat/commit/4455cd1b366654fa6a639a818a0715090f9292b3))
* **memory:** add 6-level memory extraction system ([f29c103](https://github.com/planetaryescape/blah.chat/commit/f29c1030422c20e1d7000dcc02d7328f89440782))
* **mobile:** add animated UI components ([9bb32c3](https://github.com/planetaryescape/blah.chat/commit/9bb32c34cb1365b097ce969e549bdc171bc25f44))
* **mobile:** add animated UI components ([034470c](https://github.com/planetaryescape/blah.chat/commit/034470c528175fd0454ce20e5174976bc938b5e1))
* **mobile:** add bookmarks, memories, projects, and search screens ([741fd41](https://github.com/planetaryescape/blah.chat/commit/741fd41a894a5f7b53069bb9f3a7c943cd43ebe3))
* **mobile:** add bookmarks, memories, projects, and search screens ([8e0d8be](https://github.com/planetaryescape/blah.chat/commit/8e0d8be308c2d9e54586785d2347e54476d5535f))
* **mobile:** add centralized haptics utility ([169863f](https://github.com/planetaryescape/blah.chat/commit/169863fe0ebfe73dc654de66b1d1068eae280b47))
* **mobile:** add centralized haptics utility ([535a3b6](https://github.com/planetaryescape/blah.chat/commit/535a3b6318302a37b603ea9ef36bdbe52c7b0ce5))
* **mobile:** add Expo app scaffold ([db0e596](https://github.com/planetaryescape/blah.chat/commit/db0e596cee9c5750b107ce951282ebfb7a33605b))
* **mobile:** add keyboard-controller for better keyboard handling ([3814427](https://github.com/planetaryescape/blah.chat/commit/3814427885b12189d9885f2391b44895d008cfd6))
* **mobile:** add keyboard-controller for better keyboard handling ([3233a9c](https://github.com/planetaryescape/blah.chat/commit/3233a9ceb3fa9f249130e9c1d888615f7057a8ab))
* **mobile:** add knowledge, templates, usage screens ([195d92e](https://github.com/planetaryescape/blah.chat/commit/195d92e10e2b9a88366b4370c8966becedc69134))
* **mobile:** add knowledge, templates, usage screens ([ef48fcf](https://github.com/planetaryescape/blah.chat/commit/ef48fcf765bbad15741a4d8917985245e85a3d28))
* **mobile:** add KnowledgeCard component ([54ccb19](https://github.com/planetaryescape/blah.chat/commit/54ccb19b844015608ae7e2c43049fa924bf76390))
* **mobile:** add KnowledgeCard component ([6247baa](https://github.com/planetaryescape/blah.chat/commit/6247baa4f7f03314cced0a16a775bd54442404ea))
* **mobile:** add message edit, regenerate, and shimmer components ([ed616dc](https://github.com/planetaryescape/blah.chat/commit/ed616dce9f9f9a36a94b078b6acfa9d6cb8517c0))
* **mobile:** add message edit, regenerate, and shimmer components ([3dd144a](https://github.com/planetaryescape/blah.chat/commit/3dd144a09e5d05e0cde36cbee261185876a33d96))
* **mobile:** add new sections to drawer navigation ([61bf62d](https://github.com/planetaryescape/blah.chat/commit/61bf62d5d411ae0c89db20eb37ef1b781aa094c4))
* **mobile:** add new sections to drawer navigation ([e9a67db](https://github.com/planetaryescape/blah.chat/commit/e9a67db9454f06a45526a8c8d956470e318ac142))
* **mobile:** add project file attachments ([9d759ca](https://github.com/planetaryescape/blah.chat/commit/9d759ca28e8fe13e2a8ebb318070d28da8f51b8d))
* **mobile:** add share, comparison, and canvas components ([7930434](https://github.com/planetaryescape/blah.chat/commit/7930434e9f6d07cd3d53ad7457754e221e9f6589))
* **mobile:** add share, comparison, and canvas components ([df890fc](https://github.com/planetaryescape/blah.chat/commit/df890fce0a1610edacb5288fed606be04359db72))
* **mobile:** add tasks feature ([eb7ffa7](https://github.com/planetaryescape/blah.chat/commit/eb7ffa7c2d23c43896c89eb660b5036d8e044e06))
* **mobile:** add TemplateCard component ([8d5a476](https://github.com/planetaryescape/blah.chat/commit/8d5a4764e1cef381f4ca136e47dbcb2305135fd8))
* **mobile:** add TemplateCard component ([8baf80d](https://github.com/planetaryescape/blah.chat/commit/8baf80df390a09e3f568e3ab88515bd0c34f8735))
* **mobile:** enhance drawer layout and screens ([f39d133](https://github.com/planetaryescape/blah.chat/commit/f39d133a1dad0a17694daf3c8b0d3c716c9d0097))
* **mobile:** enhance drawer layout and screens ([4299040](https://github.com/planetaryescape/blah.chat/commit/4299040f6d778ad155fb58e595cf1f3969479966))
* **mobile:** implement chat with TTS, attachments, native menus ([cc71b81](https://github.com/planetaryescape/blah.chat/commit/cc71b816f3af09e7bd021d229b8e51f269fee814))
* **mobile:** pass audio attachment with voice transcript ([ca5308e](https://github.com/planetaryescape/blah.chat/commit/ca5308e49ac7ef65ad0977834257810aa0e3266b))
* **mobile:** pass audio attachment with voice transcript ([3bad3f4](https://github.com/planetaryescape/blah.chat/commit/3bad3f4080fa456493f156f6a77a2441f8c1addd))
* **mobile:** redesign with nebula theme and glass morphism ([851cb11](https://github.com/planetaryescape/blah.chat/commit/851cb1173a34840cefbc9a1fc7ace8a480f9de29))
* **notes:** add AI auto-tag button and improve new note UX ([1b8a194](https://github.com/planetaryescape/blah.chat/commit/1b8a1940c0448c440ac728df41960d832c8ad83d))
* **projects:** auto-focus name input in Create/Edit dialogs ([78df335](https://github.com/planetaryescape/blah.chat/commit/78df3358dbe88cffb96be7c106cac47251d65814))
* **raycast:** add blah.chat extension ([1a1ad89](https://github.com/planetaryescape/blah.chat/commit/1a1ad891f8fe1a8841f8f3142be959501fc1a73a))
* **raycast:** add tasks/notes commands and model picker to reply ([8de7e21](https://github.com/planetaryescape/blah.chat/commit/8de7e219b98a9e5060b460ba851094a4f221ec74))
* **router:** add auto model routing ([52e1580](https://github.com/planetaryescape/blah.chat/commit/52e1580a6f705a91a1a8b79c6de6928f69e0a8b1))
* **schema:** add retry tracking fields for auto-router recovery ([902ec61](https://github.com/planetaryescape/blah.chat/commit/902ec610304f4f692831ec7f51ada55da06245e6))
* **schema:** add userApiKeys table for BYOK credentials ([f9120be](https://github.com/planetaryescape/blah.chat/commit/f9120be031e292c2fb1892225a7814c437d80b9d))
* **scroll:** add scroll position restoration per conversation ([b5bea22](https://github.com/planetaryescape/blah.chat/commit/b5bea223c9b0b0bb3d46452004279427da57081c))
* **scroll:** add smooth scrolling animations ([3d3bb05](https://github.com/planetaryescape/blah.chat/commit/3d3bb0542102bb06ab3bbfba9e9ac04a1e13a614))
* **scroll:** add velocity-based scroll intent detection ([dec17fd](https://github.com/planetaryescape/blah.chat/commit/dec17fdbf04305ff711f3dd24bf3c6b85ea75f96))
* **search:** add knowledge-first strategy with RRF and LLM reranking ([a17c4a1](https://github.com/planetaryescape/blah.chat/commit/a17c4a13ef7a1da02e5b6555becac1b7f9e9e08f))
* **search:** add knowledge-first strategy with RRF and LLM reranking ([c129fe6](https://github.com/planetaryescape/blah.chat/commit/c129fe60a863cd6c58a2163a9fe3b68452b5e150))
* **search:** add knowledgeBank to searchAll with caching and RRF weights ([2754549](https://github.com/planetaryescape/blah.chat/commit/2754549e328caeda884be44b4ba14aae52bf89bc))
* **search:** add knowledgeBank to searchAll with caching and RRF weights ([d444e77](https://github.com/planetaryescape/blah.chat/commit/d444e777d09dc5f55a71ead26171a666e7a6f2bf))
* **search:** add query expansion for vocabulary mismatch ([bc38e0c](https://github.com/planetaryescape/blah.chat/commit/bc38e0c92a58a713319efbfe873ed227bbe3bac3))
* **search:** add query expansion for vocabulary mismatch ([b3894be](https://github.com/planetaryescape/blah.chat/commit/b3894be457a5f78693e7d1eb5c78cf35648bdcf8))
* **settings:** add auto-compress context toggle ([9208f90](https://github.com/planetaryescape/blah.chat/commit/9208f903c9929f92e8765dec7747cccbeea801ef))
* **settings:** add Manage links to memory and knowledge sections ([1b74da2](https://github.com/planetaryescape/blah.chat/commit/1b74da29d353c5310382b657f1c7796317815d73))
* **settings:** add Manage links to memory and knowledge sections ([e5312d8](https://github.com/planetaryescape/blah.chat/commit/e5312d8027f5734172dd1b0fc9b6904d79837682))
* **settings:** add showTasks and showSmartAssistant feature toggles ([277ede0](https://github.com/planetaryescape/blah.chat/commit/277ede0d6d65811395c71ae9651892b1c462ee24))
* **settings:** add smart assistant note category configuration ([5a60de3](https://github.com/planetaryescape/blah.chat/commit/5a60de36721963af10e5252feec257c91b37a14f))
* **shared:** add centralized theme tokens ([7a7ae37](https://github.com/planetaryescape/blah.chat/commit/7a7ae376d26c7bf2f4707301de78c42c119547d1))
* **tasks:** add smart_assistant as task source type ([8ca6470](https://github.com/planetaryescape/blah.chat/commit/8ca6470d9e04806aba35130d10ebe8ced7376038))
* **tools:** add YouTube video analyzer with Gemini vision ([c52926d](https://github.com/planetaryescape/blah.chat/commit/c52926d76948107610379c5a1e9d74d61319fd04))
* **tools:** add YouTube video analyzer with Gemini vision ([b607742](https://github.com/planetaryescape/blah.chat/commit/b607742622c8f006acd2f8e1c1b4650b26a72177))
* **triage:** task-aware model alternatives with same-family preference ([12b0c28](https://github.com/planetaryescape/blah.chat/commit/12b0c286b23f2d06f1d0992e64ca2e0a47b0f2be))
* **ui:** add BYOK settings and model/voice disable checks ([f7806d3](https://github.com/planetaryescape/blah.chat/commit/f7806d39626a8c29246c6084762dff2d7d78386b))
* **ui:** add calendar component with react-day-picker ([bee085b](https://github.com/planetaryescape/blah.chat/commit/bee085b31f8364791b3691686530f30b64c3f07d))
* **ui:** add retry button and retry state indicator ([1448daf](https://github.com/planetaryescape/blah.chat/commit/1448dafd623d7b6480b6618cf4b305ed03913e23))
* upgrade AI SDK to v6 ([1dbb626](https://github.com/planetaryescape/blah.chat/commit/1dbb626912e0b170ea273424878637ac2314f5ab))
* **usage:** add embedding cost tracking infrastructure ([16f3f48](https://github.com/planetaryescape/blah.chat/commit/16f3f48859e9a782df1978951afddafe246d4a73))
* **usage:** add embedding cost tracking infrastructure ([8887c93](https://github.com/planetaryescape/blah.chat/commit/8887c93e7474d627aa4df1df1deed0257ef20aa0))
* **usage:** add feature and operation type tracking to schema ([c18f4ce](https://github.com/planetaryescape/blah.chat/commit/c18f4cefa3b4595d058eb3a80c45890c787dfd32))
* **usage:** add feature-level cost tracking to LLM operations ([3fa2439](https://github.com/planetaryescape/blah.chat/commit/3fa2439fd191ad72b28d4fd62942390d52d7b7b6))
* **usage:** add isByok tracking and breakdown query ([2634476](https://github.com/planetaryescape/blah.chat/commit/26344767d7659dc4e37f398ee2aaba410f41e866))
* **usage:** add presentation and feature breakdown queries ([6081d68](https://github.com/planetaryescape/blah.chat/commit/6081d6893f91ad32da5ba5191e290f9864b215fd))
* **usage:** add presentation stats and feature breakdown to admin usage page ([cdbc979](https://github.com/planetaryescape/blah.chat/commit/cdbc979c9ff05b1cf916cc84041f835c3f653546))
* **usage:** add presentation stats and feature breakdown to admin user page ([7b1988b](https://github.com/planetaryescape/blah.chat/commit/7b1988bb0e0175d642940c6ec72b33a6dd7c14df))
* **usage:** add presentation stats and feature breakdown to user usage page ([bff8fa0](https://github.com/planetaryescape/blah.chat/commit/bff8fa04bb56fc304cb994c2d24dfbaf85f0e760))
* **usage:** track embedding costs across all modules ([8eb2749](https://github.com/planetaryescape/blah.chat/commit/8eb274958715ce1e307d3d34501c2987d38a8528))
* **usage:** track embedding costs across all modules ([843bafd](https://github.com/planetaryescape/blah.chat/commit/843bafd2744a63da4c9f26d4d9d6e72e319b567d))
* **web:** add CLI login and API key management ([57ee6ff](https://github.com/planetaryescape/blah.chat/commit/57ee6ffda876af6427dc9c02e77565e9e238b791))
* **web:** add Danger Zone settings for data export/deletion ([5b8625f](https://github.com/planetaryescape/blah.chat/commit/5b8625f31083e360df6a16deb29473f9acc1dcf9))


### Bug Fixes

* add apiCallStartedAt field and regenerate BYOD schema v5 ([db7d999](https://github.com/planetaryescape/blah.chat/commit/db7d999475820b6d539961e2955be3b216f54113))
* add biome to root for BYOD sync script ([b6ec32d](https://github.com/planetaryescape/blah.chat/commit/b6ec32d68caf479e780b0efaaeef18ed820fde45))
* add cached system prompt fields to conversations schema ([b4c83aa](https://github.com/planetaryescape/blah.chat/commit/b4c83aa3453c4499211f56abd21a17b49d1c29be))
* add enableGrounding as optional for existing data ([90b2e1c](https://github.com/planetaryescape/blah.chat/commit/90b2e1c9f6c4747d800c5131cbc7e1959cb13131))
* add isPresentation as optional for existing conversation data ([628d531](https://github.com/planetaryescape/blah.chat/commit/628d5311bd4dee8c7d033b07b8f278caed0d17b8))
* add keyboard animation delay and unmount safety ([8e3e6ed](https://github.com/planetaryescape/blah.chat/commit/8e3e6edee289ab6c7efe4d73ec2ceb2ce282bccc))
* add missing notes.list export ([e9a4e00](https://github.com/planetaryescape/blah.chat/commit/e9a4e0094fe35e16fb8a424de7b10c76cd79186c)), closes [#89](https://github.com/planetaryescape/blah.chat/issues/89)
* add orphan detection to cache sync hooks for projects, notes, and tasks ([70b7244](https://github.com/planetaryescape/blah.chat/commit/70b72448d50406f0f2ee8ac04d785dfebaac1cbb))
* add presentation count fields to users for existing data ([e843e84](https://github.com/planetaryescape/blah.chat/commit/e843e848f53c573d2e16f327e0827e55badc8cbc))
* add presentationId to usageRecords for existing data ([76a0129](https://github.com/planetaryescape/blah.chat/commit/76a0129ef7146db2386eacfdbff023076b1b70ca))
* add slides to usageRecords feature union for existing data ([fed3819](https://github.com/planetaryescape/blah.chat/commit/fed381976dce8b636f71cea46fa24462555ccb80))
* add useAction mock in ConversationHeaderMenu test ([69698e8](https://github.com/planetaryescape/blah.chat/commit/69698e8db347e0e2eccd0714bb53e8f16ba697aa))
* address additional copilot review comments ([4314865](https://github.com/planetaryescape/blah.chat/commit/4314865c79d95dc6d894b809494a09e61f9a9d8e))
* address additional PR review comments ([02a6056](https://github.com/planetaryescape/blah.chat/commit/02a6056a7fa51d40cc783d8c10d3a3f26b1e7533))
* address code review comments ([795155e](https://github.com/planetaryescape/blah.chat/commit/795155ec6f5a197de78275a3e2c90e7eff7142fa))
* address code review comments ([6c24eb3](https://github.com/planetaryescape/blah.chat/commit/6c24eb312bf5c9c47efca8b081a835c8f4d78ee1))
* address code review feedback ([a249abd](https://github.com/planetaryescape/blah.chat/commit/a249abd93700dced7056e251e7c9bea96ec19c11))
* address code review feedback ([6ccdda6](https://github.com/planetaryescape/blah.chat/commit/6ccdda6b8b55a10b6499bda1b3c94dd9cf0ead92))
* address copilot code review comments ([0a7fd9f](https://github.com/planetaryescape/blah.chat/commit/0a7fd9f641b0987eea2b013f4195b025b840314f))
* address Copilot review comments ([e30374c](https://github.com/planetaryescape/blah.chat/commit/e30374c4964726241d6f9320afff1c418976b1a4))
* address Copilot review comments ([ef878c4](https://github.com/planetaryescape/blah.chat/commit/ef878c48412e0bbb97f4defb901aeea6b43a14cf))
* address Copilot review comments ([98e051e](https://github.com/planetaryescape/blah.chat/commit/98e051e8b808ffa76f8cb24b5da232ca54a83d47))
* address Copilot review comments ([93ff29d](https://github.com/planetaryescape/blah.chat/commit/93ff29dc89ec5f1ca8328c2d16746854a7791a32))
* address PR review - hooks before early returns ([ebdc194](https://github.com/planetaryescape/blah.chat/commit/ebdc1941722ba4dd7833df45d250395aa8e5d1c1))
* address PR review comments ([80cdcfe](https://github.com/planetaryescape/blah.chat/commit/80cdcfe530f7b2e6a4dbdeb4332ffe5ee47d7f25))
* address PR review comments ([2ad77f8](https://github.com/planetaryescape/blah.chat/commit/2ad77f8b5b094bdc409572c3beba8bfb4aef4030))
* address PR review comments ([12cf793](https://github.com/planetaryescape/blah.chat/commit/12cf793af9583edc674080ccad5cf9ed9255768b))
* address PR review comments ([0e65dec](https://github.com/planetaryescape/blah.chat/commit/0e65decb637fa74f0a2c3f199d640d459e298708))
* address PR review comments ([dde7a9f](https://github.com/planetaryescape/blah.chat/commit/dde7a9f92f5d386e0f12eab0c158f0e85649b32b))
* address PR review comments ([4b728d0](https://github.com/planetaryescape/blah.chat/commit/4b728d0d7fa6881b76a81231bf62608979817147))
* address PR review comments and CI failures ([4548d3c](https://github.com/planetaryescape/blah.chat/commit/4548d3c2e398ada749d98f3cf517961e3601e319))
* address PR review comments and CI failures ([c253fb8](https://github.com/planetaryescape/blah.chat/commit/c253fb8f8db52f2a7c6b3a0cc69a47c7d35a990c))
* address PR review comments and fix CI ([4b41c6e](https://github.com/planetaryescape/blah.chat/commit/4b41c6e196752a1a578ee32ed0a3ac291a5ae2e4))
* address PR review feedback ([7e1cb21](https://github.com/planetaryescape/blah.chat/commit/7e1cb21a8dd768fa1e4fda6b4c7ffb2dd41534c1))
* address PR review feedback ([15b03fa](https://github.com/planetaryescape/blah.chat/commit/15b03fa2222a86752dc344d6890fad82e8333798))
* address remaining PR review comments ([c76bd3f](https://github.com/planetaryescape/blah.chat/commit/c76bd3fcf1d32ba8b38df8192c0a4d9702188061))
* address remaining PR review comments ([df786db](https://github.com/planetaryescape/blah.chat/commit/df786dba287f78a2360710301cddd3ca51a5e792))
* address review comments ([be82c14](https://github.com/planetaryescape/blah.chat/commit/be82c14b956d11476615ecd2d11bf9f88f1ad42a))
* address review comments - expand glob, add CI comment ([116ae12](https://github.com/planetaryescape/blah.chat/commit/116ae12832276da588760159e87057c7544e01d4))
* address review feedback and CI failures ([71f9a7d](https://github.com/planetaryescape/blah.chat/commit/71f9a7d33835f3622e7bb09ed420dbbe9c32612a))
* **admin:** use Clerk session for admin check instead of Convex ([d3c817d](https://github.com/planetaryescape/blah.chat/commit/d3c817d835e73bae1838bce4e434850788b4a03f))
* **ai:** use raw base64 and gateway pattern for file extraction ([68085f4](https://github.com/planetaryescape/blah.chat/commit/68085f4ca405d194098f17fa81c54ac679196dd9))
* **ai:** use raw base64 and gateway pattern for file extraction ([375ab6a](https://github.com/planetaryescape/blah.chat/commit/375ab6a17aa27833ff332b45f50dfc6ce6f82209))
* align incognito button styling with new chat button ([c9cc3fd](https://github.com/planetaryescape/blah.chat/commit/c9cc3fd02ab0518103c87694ef41471675fec4f9))
* attempt and revamp of virtual message component - specially differentiating empty list from undefined messages ( not loaded yet ) ([4d40fea](https://github.com/planetaryescape/blah.chat/commit/4d40fea2083ac34ccb6c418a1f27574a53bd3319))
* attempt and revamp of virtual message component - specially differentiating empty list from undefined messages ( not loaded yet ) ([aebe3e8](https://github.com/planetaryescape/blah.chat/commit/aebe3e80947d9d659e0bbece5f3597176a18a96b))
* **auth:** add horizontal padding to scrollable content area ([d73f8c3](https://github.com/planetaryescape/blah.chat/commit/d73f8c31e66b49b3150264b86dfbff605c2074fa))
* **auth:** improve sign-up/sign-in page transitions and layout stability ([2daa18d](https://github.com/planetaryescape/blah.chat/commit/2daa18d13ee8610f5ffe98ad0603ddf0e378d1d3))
* **backend:** improve conversation sorting and title generation ([f7b11a7](https://github.com/planetaryescape/blah.chat/commit/f7b11a7252574c0e1cac2133065a5c73641b3f31))
* **backend:** improve conversation sorting and title generation ([ae03f16](https://github.com/planetaryescape/blah.chat/commit/ae03f16dc34ad0f89554b62ad9f058dcb1f439b0))
* **backend:** use filter for tables without by_user index ([7b58cf0](https://github.com/planetaryescape/blah.chat/commit/7b58cf0887d418003d783ae2ac9d597a983fafc4))
* **bookmarks:** use safer React keys for tag lists ([808e2b3](https://github.com/planetaryescape/blah.chat/commit/808e2b387d8755c52e03640080d5555f6e6cb22f))
* **bookmarks:** use Unicode quotes instead of HTML entities in JSX ([a9c66c3](https://github.com/planetaryescape/blah.chat/commit/a9c66c346484eea8e406813a525abbcfa6aa959a))
* BYOD sync script outputs Biome-compliant code ([429fbda](https://github.com/planetaryescape/blah.chat/commit/429fbda6b2d57985248a370de99278e52060559f))
* **byok:** address PR review feedback ([8b35bb0](https://github.com/planetaryescape/blah.chat/commit/8b35bb09aeaebea55a31bb0bec54a44e37434ba1))
* **byok:** handle missing encryption key with user-friendly error ([11639ff](https://github.com/planetaryescape/blah.chat/commit/11639ff0f63c1847d259020726b4ef34dc6ab265))
* **byok:** improve error messages for API key validation ([eff3342](https://github.com/planetaryescape/blah.chat/commit/eff3342ab4c72f96df698c7b7ed2e53236f31294))
* **byok:** remove duplicate code and fix field clearing bug ([e0a21cc](https://github.com/planetaryescape/blah.chat/commit/e0a21cc4a8053828b17f536b290b9d93817d42c3))
* **byok:** validation fail-secure and remove key UI update ([a4db595](https://github.com/planetaryescape/blah.chat/commit/a4db595ad30d9d804ac5ef94da34cbe6d783920c))
* **canvas:** add toast feedback and loading state to version restore ([24e74d8](https://github.com/planetaryescape/blah.chat/commit/24e74d8df41aa06aa1590de1591fd345ab751e3a))
* **cascade:** add missing conversation cascade deletions ([15e6f1e](https://github.com/planetaryescape/blah.chat/commit/15e6f1ef7ee34524c113dcc09c775f28a4ca0fa0))
* **cascade:** add missing conversation cascade deletions ([f3f6a66](https://github.com/planetaryescape/blah.chat/commit/f3f6a663e8a9f8c7616ba61409dd9fe7565f513b))
* chat skeletons while loading and scrolling to last message ([22869f5](https://github.com/planetaryescape/blah.chat/commit/22869f5a28b19f32f008a9dbbf5bb70424b14b2c))
* chat skeletons while loading and scrolling to last message ([da079e1](https://github.com/planetaryescape/blah.chat/commit/da079e1c05cef7c9d98789942ad14cbaf9731139))
* **chat:** add missing tool renderers and icons ([a633a46](https://github.com/planetaryescape/blah.chat/commit/a633a46a3703576d9d810d4fa9c37e7f2b2a5f0d))
* **chat:** add type=button to prevent form submission ([02b5d2c](https://github.com/planetaryescape/blah.chat/commit/02b5d2cbb519d5207c48c2dfc6f03c8036134e54))
* **chat:** eliminate scroll flash in virtualized message list ([ec7af24](https://github.com/planetaryescape/blah.chat/commit/ec7af245d7fdb59e0660283021267e9fd4d5a579))
* **chat:** improve scroll and prefetch behavior ([5a5ca7c](https://github.com/planetaryescape/blah.chat/commit/5a5ca7c4326fb5226434dc5ad7b7b6f726f72827))
* **chat:** improve scroll and prefetch behavior ([e8c4c93](https://github.com/planetaryescape/blah.chat/commit/e8c4c93218305d87808258337be939ad0385c2a2))
* **chat:** include textPosition in tool call transformation ([6b0d88d](https://github.com/planetaryescape/blah.chat/commit/6b0d88d553b6c5fe1080c9eda44a694803762ff7))
* **chat:** include textPosition in tool call transformation ([d467135](https://github.com/planetaryescape/blah.chat/commit/d46713531d119ceebd2ac133f42c36431bcff35e))
* **chat:** respect showMessageStatistics for context indicator ([7c64b56](https://github.com/planetaryescape/blah.chat/commit/7c64b56e99069135f81ccb8c4a262e9629166613))
* **chat:** transform tool calls from DB to UI format ([50d1054](https://github.com/planetaryescape/blah.chat/commit/50d1054fc6dfdf80a48dcac68544b99ec79494b5))
* **chat:** use actual routed model for Auto context window display ([691e421](https://github.com/planetaryescape/blah.chat/commit/691e42101d9054fa116281baee0c1d9c80c51f08))
* **chat:** validate conversationId and lift queries to reduce subscriptions ([39e70f6](https://github.com/planetaryescape/blah.chat/commit/39e70f69fbe8ef09b84cca506a7b059a1d99d44b))
* **ci:** align release-please with easydeck pattern ([2214afa](https://github.com/planetaryescape/blah.chat/commit/2214afaa66e5d16212789513daad5e9d2eabbad7))
* **ci:** correct Id type annotation and regenerate BYOD schema ([2fad639](https://github.com/planetaryescape/blah.chat/commit/2fad6392b231988e011334348a9caa900d2d0fcd))
* **ci:** properly filter process.env for playwright ([9a821c7](https://github.com/planetaryescape/blah.chat/commit/9a821c7ca7155e366cb78a726fbe59e5cdef6854))
* **ci:** remove redundant build dep from test:e2e ([3a63d79](https://github.com/planetaryescape/blah.chat/commit/3a63d79c5c8aae002b07e790e90faf26fefd7f15))
* **ci:** resolve failing jobs in monorepo structure ([a8f4e1b](https://github.com/planetaryescape/blah.chat/commit/a8f4e1b1cc56dd316e0caff29998012dcce2d2ef))
* **ci:** separate backend tests and generate convex types before tests ([b575b33](https://github.com/planetaryescape/blah.chat/commit/b575b331fa1833de73d069aa917318ac3977984a))
* **ci:** sync workflow with main branch ([695b73a](https://github.com/planetaryescape/blah.chat/commit/695b73a48be9398fce7da689dfa5eccb1c99b2c7))
* **ci:** update e2e workflow paths for monorepo and add environment ([ae09c52](https://github.com/planetaryescape/blah.chat/commit/ae09c52a860f79f61e7b1ae2718d056ea8fa063b))
* **ci:** use local bun script for convex typecheck ([28bf7c2](https://github.com/planetaryescape/blah.chat/commit/28bf7c27749ab32405394aa32986021acf6963d2))
* **ci:** use monorepo test setup + turbo env passthrough ([e4a26c1](https://github.com/planetaryescape/blah.chat/commit/e4a26c1f3d8870881aa3efb14aef78c8be10da00))
* clarify retry count semantics ([53df591](https://github.com/planetaryescape/blah.chat/commit/53df59160a8fa16f9a98c5b5c42be4413ef27aa9))
* clean up unused imports and variables ([f1a6a92](https://github.com/planetaryescape/blah.chat/commit/f1a6a92db96bccf23fc925cd87c555c9f66362bb))
* clear optimistic messages when transitioning to undefined state ([2c54169](https://github.com/planetaryescape/blah.chat/commit/2c5416993a1f198b7f10fd0a73b1fa5c656a805b))
* clear optimistic messages when transitioning to undefined state ([2c20180](https://github.com/planetaryescape/blah.chat/commit/2c2018042563c8df38c0b7873acdcabc010d737b))
* convex scripts ([701afd7](https://github.com/planetaryescape/blah.chat/commit/701afd752c96e14e6c6dcd0dc408954d99adfc95))
* correct off-by-one in retry count comparison ([87db7bc](https://github.com/planetaryescape/blah.chat/commit/87db7bc921eb33fad3edc9814fdd5285b3719e3a))
* correct schema field names and regenerate BYOD schema ([5f68670](https://github.com/planetaryescape/blah.chat/commit/5f686706b75a6726d0cda3f79e7669119b7e4510))
* date rollover bug in checkBudget test ([cf7eb6d](https://github.com/planetaryescape/blah.chat/commit/cf7eb6d6259dec170e02119aec5bd92eca33500d))
* delete usePresentationSync hook ([ad1f110](https://github.com/planetaryescape/blah.chat/commit/ad1f110955d522e2756ea621a0f527b3ce4898fa))
* disable actions on temp optimistic messages ([3efdc31](https://github.com/planetaryescape/blah.chat/commit/3efdc3160c23bd421b919c90afb305d7bacb20e4))
* enable PostHog analytics with reverse proxy and pageview tracking ([91bd746](https://github.com/planetaryescape/blah.chat/commit/91bd746be8b287b54e1340e171cf7e81509218fb))
* ensure CI passes ([0fa6a42](https://github.com/planetaryescape/blah.chat/commit/0fa6a424301ca3096af682996767a5ae9a404238))
* ensure CI passes ([6e911ae](https://github.com/planetaryescape/blah.chat/commit/6e911ae0896c496355a908d0b84c4db6ba49978f))
* ensure CI passes ([055443f](https://github.com/planetaryescape/blah.chat/commit/055443f9ecd253b6443425d000f4aef8c52a436a))
* exclude test files from convex typecheck ([9ad8e63](https://github.com/planetaryescape/blah.chat/commit/9ad8e6348f71aec3d6c78882e62ee76fba56af96))
* explicitly type timeoutId to allow undefined state ([01807d3](https://github.com/planetaryescape/blah.chat/commit/01807d3ee0d251cbb8a3fe24e27ce6fe1d7653cd))
* explicitly type timeoutId to allow undefined state ([437dee3](https://github.com/planetaryescape/blah.chat/commit/437dee3846252600eaae7a4aec3fb9fdf5177b16))
* format NoteEditor.tsx ([dfc1c5e](https://github.com/planetaryescape/blah.chat/commit/dfc1c5eb7ea9df5b8d34c4dbaef24d4ef8cab39e))
* **generation:** address code review feedback ([3a5f352](https://github.com/planetaryescape/blah.chat/commit/3a5f352cae472fd9ae93f38ac120087eff40ace9))
* **generation:** address PR review comments ([45d4ee6](https://github.com/planetaryescape/blah.chat/commit/45d4ee658cdeeae33381a38b6797cf745c9248fc))
* **generation:** calculate wasted cost from actual accumulated tokens ([3379863](https://github.com/planetaryescape/blah.chat/commit/3379863c2bd6e56320898cd1553948502b417837))
* **generation:** detect attachments for auto-router model selection ([7b3dbf5](https://github.com/planetaryescape/blah.chat/commit/7b3dbf5625671d56c3c8a2f629c49671c8312b95)), closes [#132](https://github.com/planetaryescape/blah.chat/issues/132)
* **generation:** include input tokens in wasted cost calculation ([048e064](https://github.com/planetaryescape/blah.chat/commit/048e0648e026fcdf7c795c0974049c832ab85d81))
* **generation:** prevent race condition in message status updates ([5dd5a27](https://github.com/planetaryescape/blah.chat/commit/5dd5a27d1b45d7386df1931d30ec89d69e8e7512))
* **generation:** prevent Unicode splitting crashes ([5d4573c](https://github.com/planetaryescape/blah.chat/commit/5d4573c5c32cacac5b80766647064850030c776c))
* **hooks:** add defensive checks and optimistic preference caching ([0ba29fd](https://github.com/planetaryescape/blah.chat/commit/0ba29fd7dfd6ecf2251ca958d2a3c88b00fe0dd1))
* improve scroll behavior for new messages ([c4e9696](https://github.com/planetaryescape/blah.chat/commit/c4e969675f1381d2367e52e2b9ac6fa522bd4f78))
* increase scroll threshold, improve type safety ([c8d5779](https://github.com/planetaryescape/blah.chat/commit/c8d5779ee43e9819a34dd9d43567e17bf7676fd2))
* iOS Safari virtual keyboard covering input field ([855c840](https://github.com/planetaryescape/blah.chat/commit/855c840d5185d71190923ef2aa57fa5c70dc69c5))
* keep /ingest hardcoded for reverse proxy ([7c993ce](https://github.com/planetaryescape/blah.chat/commit/7c993cec44e248fc942c2bc5eeb79a505a337f02))
* keep defaultDailyPresentationLimit as optional for existing data ([11a5940](https://github.com/planetaryescape/blah.chat/commit/11a59402842093e5db2a0d8e5b42523070c65c22))
* **knowledge:** constrain text input height with scroll overflow ([56ea19c](https://github.com/planetaryescape/blah.chat/commit/56ea19ce61e3bfdb2d205b36633cf983d3235ffe))
* **landing:** adapt navigation colors based on theme mode ([174f16b](https://github.com/planetaryescape/blah.chat/commit/174f16bfab6911e326c14854dab6ca335aa6ca42))
* **landing:** implement reliable navigation color switching based on scroll position ([58a371c](https://github.com/planetaryescape/blah.chat/commit/58a371cbb53a234ecab313458e15a1781392983a))
* **landing:** improve navigation color detection using viewport center ([0ab29f3](https://github.com/planetaryescape/blah.chat/commit/0ab29f3a9fac49a45c72dbbd8f7c7778a5266092))
* **landing:** improve navigation visibility and mobile responsiveness ([3b52746](https://github.com/planetaryescape/blah.chat/commit/3b5274625794527816908a882e820c098afb85aa))
* **landing:** remove excessive horizontal padding from CTA section ([0a88cca](https://github.com/planetaryescape/blah.chat/commit/0a88cca11eadc0736c2061841e46b99995dbd394))
* **landing:** simplify FeatureCard to fix empty cards on mobile ([d055281](https://github.com/planetaryescape/blah.chat/commit/d0552819b36c12c64c73c8ac24d4201f1ad87353))
* lint errors in slides page ([08d4571](https://github.com/planetaryescape/blah.chat/commit/08d4571909e6c7117e01519b8dfc160fae7c489c))
* **mobile:** add biome devDependency for CI lint ([7ba5a12](https://github.com/planetaryescape/blah.chat/commit/7ba5a121e030535f59c59277b518c618eac5b465))
* **mobile:** disable typecheck that fails on backend path aliases ([b393b66](https://github.com/planetaryescape/blah.chat/commit/b393b6682afef75c1f1fb304090a058e01443da6))
* **mobile:** enable pointer events on UserButton popover for touch interaction ([b7a41c0](https://github.com/planetaryescape/blah.chat/commit/b7a41c0fbc1433bab16de83a063406d0f3b59f16)), closes [#122](https://github.com/planetaryescape/blah.chat/issues/122)
* **mobile:** resolve TypeScript errors for CI ([71ff82b](https://github.com/planetaryescape/blah.chat/commit/71ff82b870426e1eea78deef352c40b5bb0f7687))
* move all hooks before early returns in ProjectsPage ([e09ab62](https://github.com/planetaryescape/blah.chat/commit/e09ab62d66f268a928694d2230e2a693a0ab89af))
* move browser-specific getValidatedDateRange back to web, update byodConfig import ([c08dc66](https://github.com/planetaryescape/blah.chat/commit/c08dc668d07d1e052a51518eaf9b743645d1e6eb))
* move constant to shared file to avoid Convex browser import warning ([3bfa94d](https://github.com/planetaryescape/blah.chat/commit/3bfa94d4e6b998d7fb3bbb38d78d311bf1d52d64))
* move early returns before hooks in model components ([4efa266](https://github.com/planetaryescape/blah.chat/commit/4efa26667f07282012b1bac194af07a376c4f625))
* move hooks before early returns in bookmarks and templates pages ([b77bee6](https://github.com/planetaryescape/blah.chat/commit/b77bee6573450a3ca19b0369e104fa938495f17e))
* only track pageviews on pathname changes ([0d6335f](https://github.com/planetaryescape/blah.chat/commit/0d6335f4890628bbdda4c2babfc57004af864148))
* prevent chat scroll from hiding user message behind header ([14b78b5](https://github.com/planetaryescape/blah.chat/commit/14b78b5854208b218b4a7a94cfb8709f3e02b7c0))
* prevent ChatInput unmount during conversation navigation ([096b244](https://github.com/planetaryescape/blah.chat/commit/096b24407a4929721fdd84497d6ce2f867b53e75))
* prevent ChatInput unmount during conversation navigation ([3d85881](https://github.com/planetaryescape/blah.chat/commit/3d858816caf4da8bc7c87242a330703f5afdf3d1))
* prevent false positive on first-message detection during page refresh ([8a89928](https://github.com/planetaryescape/blah.chat/commit/8a89928b495df9a72037233fa499aa648f2abeba))
* prevent false positive on first-message detection during page refresh ([6b56d0e](https://github.com/planetaryescape/blah.chat/commit/6b56d0e054cd8a544fe984d3440f7a321a5eb869))
* prevent infinite render loop in useIOSKeyboard ([81b05b1](https://github.com/planetaryescape/blah.chat/commit/81b05b1b2bc3c41366bfe1494402dc36f6dfbbb5))
* prevent memory leak from orphaned timeouts in scroll logic ([85b63f3](https://github.com/planetaryescape/blah.chat/commit/85b63f322dc84ef6def5d9909e1b251e28c32322))
* prevent memory leak from orphaned timeouts in scroll logic ([f4a1fa1](https://github.com/planetaryescape/blah.chat/commit/f4a1fa14c97c2575517d63eab9daf3b083fa775c))
* prevent recursive timeout memory leak in scroll logic ([5e1f924](https://github.com/planetaryescape/blah.chat/commit/5e1f924a65913ceea1fa07ab3fecde5b381d5646))
* prevent recursive timeout memory leak in scroll logic ([9e61ac0](https://github.com/planetaryescape/blah.chat/commit/9e61ac057c55f9bd27f868cb2c3efa3f35c51a4b))
* prevent scroll race condition between conversation and highlight ([734a09f](https://github.com/planetaryescape/blah.chat/commit/734a09f8df3f6b1971120b1761006cfdd75111fe))
* prevent scroll race condition between conversation and highlight ([3eb8edd](https://github.com/planetaryescape/blah.chat/commit/3eb8eddad1ffaea533f15344f7a4dccae5a3461f))
* prevent vacuous truth bug in cache validation logic ([7f9e789](https://github.com/planetaryescape/blah.chat/commit/7f9e78967fab4b27c587142555b991270034d5d9))
* prevent vacuous truth bug in cache validation logic ([2155fe5](https://github.com/planetaryescape/blah.chat/commit/2155fe5bb1cd11260cc01b3196f7a6eda373ce36))
* **projects:** prevent double-submission with debounced form handler ([60787d5](https://github.com/planetaryescape/blah.chat/commit/60787d528f880a676c61557500f39eca69257d4b))
* raycast CI - add package-lock.json, remove unused defaultModel state ([42b6844](https://github.com/planetaryescape/blah.chat/commit/42b68444199e048f0f3aa1e016140db397da7c7d))
* **raycast:** remove unused import and fix type import ([ee40c60](https://github.com/planetaryescape/blah.chat/commit/ee40c600da7eb7cfef9927f0d684273911ba5b11))
* **raycast:** update model references ([5243a84](https://github.com/planetaryescape/blah.chat/commit/5243a84adf59eb8ab33b3d32b4456b85914ccb0c))
* **recovery:** prevent race condition with active generation ([05d5d1d](https://github.com/planetaryescape/blah.chat/commit/05d5d1df458e6b4aeaf5a976ff8dae8f36ef3ad4))
* regenerate bun.lock for CI compatibility ([f0aded9](https://github.com/planetaryescape/blah.chat/commit/f0aded9e03436c653fe77878ae24a11b7230e72b))
* regenerate bun.lock with bun 1.3.5 ([e9d21f8](https://github.com/planetaryescape/blah.chat/commit/e9d21f854bdcf128b28473dae673e9df4db833f7))
* regenerate lockfile and fix package name convention ([dd97580](https://github.com/planetaryescape/blah.chat/commit/dd975802556a0b6c5a63fde29d29c9190243bf8d))
* regenerate lockfile without uncommitted CLI workspace ([0b45d2f](https://github.com/planetaryescape/blah.chat/commit/0b45d2f2e520ea35dfc7281e67f3ca35c80785bc))
* remove chatWidth loading dependency to unblock empty conversations ([a9dbaf9](https://github.com/planetaryescape/blah.chat/commit/a9dbaf9a8a886856887daabe43adcbf37d80cd52))
* remove chatWidth loading dependency to unblock empty conversations ([10b2ded](https://github.com/planetaryescape/blah.chat/commit/10b2ded5c78611ab41f0f0698fd9477ecdf3599f))
* remove dead presentation code from generation.ts ([3dfb4a5](https://github.com/planetaryescape/blah.chat/commit/3dfb4a52686ab4f8a4953c95732e564e8a382725))
* remove duplicate model suggestion banner ([fa63685](https://github.com/planetaryescape/blah.chat/commit/fa636854f4c026730056e366dc12860e749bf327))
* remove flawed initial mount detection logic in scroll hook ([741353f](https://github.com/planetaryescape/blah.chat/commit/741353f758a13581453ce3f0e97c7e3597eb2713))
* remove flawed initial mount detection logic in scroll hook ([517df4a](https://github.com/planetaryescape/blah.chat/commit/517df4a5b230da4beae57b42543ae4d62f32db80))
* remove presentations from BYOD sync script ([ab013e9](https://github.com/planetaryescape/blah.chat/commit/ab013e9cec6f1437eb820288a3ef51443458467a))
* removes unnecessary 'Loading' message ([8b8aaa2](https://github.com/planetaryescape/blah.chat/commit/8b8aaa237f2e828f1485cb684ad89038bdcff30b))
* removes unnecessary 'Loading' message ([c1fde0a](https://github.com/planetaryescape/blah.chat/commit/c1fde0a96025d7edb07138e9e5edb72e80030a70))
* rename byod-config.ts to byodConfig.ts (Convex disallows hyphens) ([fc836ae](https://github.com/planetaryescape/blah.chat/commit/fc836aec693c452137fa21e77da4bd79de1b843a))
* resolve CI failures for biome version and officeparser API ([e767c28](https://github.com/planetaryescape/blah.chat/commit/e767c28813f9e5adfb9cc4277709bceed776a636))
* resolve remaining CI failures ([c7d830e](https://github.com/planetaryescape/blah.chat/commit/c7d830eb61a180ae4100441744a63d2ba6263004))
* resolve type errors for CI ([08810df](https://github.com/planetaryescape/blah.chat/commit/08810dfc95c9fb5576672e854a056b9f11d54b84))
* resolve type errors for CI compliance ([602432e](https://github.com/planetaryescape/blah.chat/commit/602432e634c1e8512733b6349b99a9039808c275))
* resolve type errors in VirtualizedMessageList and generation ([4c14bd7](https://github.com/planetaryescape/blah.chat/commit/4c14bd7899190f240ca7db68d9a112316ab4483a))
* restore chat width transitions for smooth UX ([ca69c6f](https://github.com/planetaryescape/blah.chat/commit/ca69c6fd6aca48a3c6bdf6b27330d76466de3f2e))
* restore chat width transitions for smooth UX ([f46e770](https://github.com/planetaryescape/blah.chat/commit/f46e770b22f1ad584ad348090db929dab1784b93))
* restore loading indicator for authenticated users on app landing page ([3758d51](https://github.com/planetaryescape/blah.chat/commit/3758d5168f3fc9a8dc363a755671379b7a048999))
* restore loading indicator for authenticated users on app landing page ([f471277](https://github.com/planetaryescape/blah.chat/commit/f471277ea2fa0cbc19e87321ebb117752e52a288))
* retry scroll-to-bottom as virtualized items are measured ([5ea2e5f](https://github.com/planetaryescape/blah.chat/commit/5ea2e5f2e4373448ce81fde63615068314c85990))
* revamp layout chat elements loading effects to load only once ( width size ) ([03e77ba](https://github.com/planetaryescape/blah.chat/commit/03e77badc946687d655fa7d0f2a1822287270b17))
* revamp layout chat elements loading effects to load only once ( width size ) ([e5c301a](https://github.com/planetaryescape/blah.chat/commit/e5c301a9c5f3614fe4ce979696fb94366d19b76a))
* **router:** improve model diversity with weighted tier selection ([ed92fc6](https://github.com/planetaryescape/blah.chat/commit/ed92fc62f97890902e492f366d28b6f89e7c2c2c))
* **schema:** add apiCallStartedAt field to messages table ([e9a3e95](https://github.com/planetaryescape/blah.chat/commit/e9a3e95fc6400b3b67671a5b334b2aeb5b857ed5))
* scroll to bottom on conversation load with cache ([3abf34a](https://github.com/planetaryescape/blah.chat/commit/3abf34a756f1adf6c5d8d23b76de996cc7dd95b0))
* **scroll:** use correct scrollToBottom function signature ([256f8f9](https://github.com/planetaryescape/blah.chat/commit/256f8f931d13efe27d0fd9a855061b246334065d))
* **settings:** handle undefined recentModels array ([32a5b70](https://github.com/planetaryescape/blah.chat/commit/32a5b70c090c9d2863ef80b5c99bb5db391c9ecd))
* show skeleton instead of "New Chat" while loading chat title ([4a2e72f](https://github.com/planetaryescape/blah.chat/commit/4a2e72f7c1c5d245f5a49f7b8cfd2c2765aa291c)), closes [#93](https://github.com/planetaryescape/blah.chat/issues/93)
* sort imports in auth layout ([12385c0](https://github.com/planetaryescape/blah.chat/commit/12385c0acaf8f9237426ccd6ef201c0fc15e27bc))
* styles ([0c35780](https://github.com/planetaryescape/blah.chat/commit/0c35780bbabad375d05dd5380138f45ff5233d9c))
* styles ([a798425](https://github.com/planetaryescape/blah.chat/commit/a798425fb4dc7d129117aa6452cfe5b566d31c22))
* styles ([a7cbb16](https://github.com/planetaryescape/blah.chat/commit/a7cbb16893c3ac1b2383918f7c59a6ee057f8856))
* suppress Mermaid error SVG rendering ([e8572fe](https://github.com/planetaryescape/blah.chat/commit/e8572feba452e4ab222f5b1a7f737cb43af6a473))
* **test:** add missing useAction mock to ChatInput tests ([70cd73c](https://github.com/planetaryescape/blah.chat/commit/70cd73c5a59a6c004e049907af7b505090816ba6))
* **test:** add missing useAction mock to ChatInput tests ([3c451ec](https://github.com/planetaryescape/blah.chat/commit/3c451ecb495c9d936fbbe0a879ce36e2deef144f))
* **tests:** add fake timers to conversations tests ([caa0a26](https://github.com/planetaryescape/blah.chat/commit/caa0a2668aa648bd9919ef2348e5ed8e4c8571f8))
* **tests:** mock Dexie cache and update useSendMessage test ([106b4be](https://github.com/planetaryescape/blah.chat/commit/106b4bed536002747c02b84c28e9a22e35b29181))
* treat empty array as valid data in cache validation ([1b97488](https://github.com/planetaryescape/blah.chat/commit/1b97488637b3f581ee73fbdb002013647531f308))
* treat empty array as valid data in cache validation ([23ba65b](https://github.com/planetaryescape/blah.chat/commit/23ba65b7810728eb4ce404f0633a070697ef7be2))
* **triage:** use model.provider for same-family bonus ([b71dec3](https://github.com/planetaryescape/blah.chat/commit/b71dec325d191bfb702209257f63c057b858bc48))
* **tts:** fix loading forever bug and clean up dead code ([13c1ddf](https://github.com/planetaryescape/blah.chat/commit/13c1ddf6969fdc2f6b69b023e9965271522a7470))
* **ui:** improve skeletons, spacing, and hover actions in sidebar and chat ([c9098b7](https://github.com/planetaryescape/blah.chat/commit/c9098b71e4c5c0bf9685c5e55b9786c35ab32b23))
* update CSS syntax for tailwind v4 compatibility ([af18db6](https://github.com/planetaryescape/blah.chat/commit/af18db67052fb37ed72680198f51ac37191fe993))
* update lockfile for date-fns in shared package ([df71e17](https://github.com/planetaryescape/blah.chat/commit/df71e17eeffbe55e8431128d04600022a4df347e))
* use bun x for Biome in sync script ([05b9974](https://github.com/planetaryescape/blah.chat/commit/05b99742cd14e697656cd7bb2a137cbad0ef7470))
* use estimateTokens from counting.ts consistently ([a6937c7](https://github.com/planetaryescape/blah.chat/commit/a6937c799db6234bf4cbe817a0390a7791d001e6))
* use filter() for tags table (no by_user index) ([7319dd3](https://github.com/planetaryescape/blah.chat/commit/7319dd3b547dceea7e2d71f225948426bea7be8c))
* use native scroll for reliable scroll-to-bottom on load ([f703755](https://github.com/planetaryescape/blah.chat/commit/f7037559067f7fbac5c5950c7fba1ff80fa2578a))
* use ref for interval cleanup in useTypewriter hook ([627d3e1](https://github.com/planetaryescape/blah.chat/commit/627d3e185b13dc90ff354467554ead776e3f0a86))
* use typecheck script instead of tsc in lefthook ([ccb5468](https://github.com/planetaryescape/blah.chat/commit/ccb54682e20ce1c39f90662b3408e861e0d9232c))
* **web:** improve cache sync and loading states ([bae94d0](https://github.com/planetaryescape/blah.chat/commit/bae94d02e003a949c87fca1161dccb85770dc7d1))
* **web:** improve cache sync and loading states ([2af1f4f](https://github.com/planetaryescape/blah.chat/commit/2af1f4f956b6bdecbce9bbde190b80e4774d65c5))
* **web:** improve mobile chat layout ([fb41df5](https://github.com/planetaryescape/blah.chat/commit/fb41df5222f16c3e4aa04c69c38bedd69b88d3c9))
* **web:** improve UI stability and fix Gemini pricing ([d331773](https://github.com/planetaryescape/blah.chat/commit/d3317732d88e5f64e5ad9ee3bdf2a868be2b0daf))
* **web:** prevent tooltip focus stealing on mobile chat input ([d77ee5f](https://github.com/planetaryescape/blah.chat/commit/d77ee5f88a25ea5aff1b6661d00f57337bf2e4e3))
* **web:** resolve type errors in cache sync and chat components ([9032682](https://github.com/planetaryescape/blah.chat/commit/9032682b43cac6e070077890c097a5b3cedb79c6))


### Performance Improvements

* **chat:** add content-visibility and semantic article element ([05fd919](https://github.com/planetaryescape/blah.chat/commit/05fd9193a466b702a15f6fea483b0f36787b75b1))
* **chat:** add content-visibility and semantic article element ([165bf0c](https://github.com/planetaryescape/blah.chat/commit/165bf0c28ad99413e16263764c660aa799a20835))
* **generation:** fix race condition in stop generation ([7eecc59](https://github.com/planetaryescape/blah.chat/commit/7eecc593af1f0792e958473a4c88e405e719f1d5))
* **generation:** optimize TTFT with parallel queries and faster streaming ([899f443](https://github.com/planetaryescape/blah.chat/commit/899f443ce654fd4ffe353cc5270262835eae34f8))
* reduce content fade-in from 500ms to 200ms ([5a7ae25](https://github.com/planetaryescape/blah.chat/commit/5a7ae256141d47605e7c4ca8ecc12acc5c765750))
* reduce content fade-in from 500ms to 200ms ([28d3b95](https://github.com/planetaryescape/blah.chat/commit/28d3b95696556edf5b4cd4757f95c2b5526d7a2b))
* **streaming:** optimize markdown rendering with memoization and deferred updates ([d8ed938](https://github.com/planetaryescape/blah.chat/commit/d8ed938b692ee34f210e915ee895adffe12056db))
* use by_user index for fileChunks query ([57231a9](https://github.com/planetaryescape/blah.chat/commit/57231a901e7f9c162824833f2112922652a1dbd3))
* use by_user index for knowledgeChunks ([ba29cf5](https://github.com/planetaryescape/blah.chat/commit/ba29cf535731d78d036685fea0a6ab38e9b6d76e))
* use specific transition property instead of transition-all ([e7694e3](https://github.com/planetaryescape/blah.chat/commit/e7694e3f5d252e2689526a6aa32a57412d1da2df))
* use specific transition property instead of transition-all ([15d8ccb](https://github.com/planetaryescape/blah.chat/commit/15d8ccb5e2df8f9a5dbaf4ab0dff652e4255c22a))
