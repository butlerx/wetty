# Changelog

## [5.0.0](https://github.com/butlerx/wetty/compare/wetty-v4.2.1...wetty-v5.0.0) (2026-11-15)


### ⚠ BREAKING CHANGES

* **security:** configure at least one trusted origin using --allowed-origin, ALLOWEDORIGINS, or server.allowedOrigins before starting WeTTY. No localhost or request-derived origins are implicitly allowed.
* release v3.0.0

### Features

* add PWA support (manifest, service worker, icon) ([#601](https://github.com/butlerx/wetty/issues/601)) ([66b6428](https://github.com/butlerx/wetty/commit/66b64281c0510585184f1083fa347ed4216850e6))
* **client:** desktop notifications with blinking favicon ([#709](https://github.com/butlerx/wetty/issues/709)) ([019c456](https://github.com/butlerx/wetty/commit/019c456ee35e016bac960325d828289bff692e92))
* **client:** sync browser tab title with terminal OSC 0/2 ([#620](https://github.com/butlerx/wetty/issues/620)) ([e1bf4ec](https://github.com/butlerx/wetty/commit/e1bf4ecc3b72022221c0fd6a0fc70afa7c9221e0))
* **client:** sync tab title with terminal OSC 0/2 ([e1bf4ec](https://github.com/butlerx/wetty/commit/e1bf4ecc3b72022221c0fd6a0fc70afa7c9221e0))
* make Socket.IO ping interval/timeout configurable ([#677](https://github.com/butlerx/wetty/issues/677)) ([a9b62d9](https://github.com/butlerx/wetty/commit/a9b62d94c15b7b1dee4e64895637c1a7ab0b7b37))
* **protocol:** type and validate socket events ([93a430b](https://github.com/butlerx/wetty/commit/93a430b847299f0aee726f541f7c884ad80928b9))
* release v3.0.0 ([ebda43f](https://github.com/butlerx/wetty/commit/ebda43f8dd50de388720a3389d020758c2dda1a9))


### Bug Fixes

* 202, check if ssl is defined ([d158435](https://github.com/butlerx/wetty/commit/d1584354d53b67cf39f0e659ae9fc92cbdc82f90))
* 203, update docs with uptodate args ([eec9862](https://github.com/butlerx/wetty/commit/eec9862fece795cd4e247c3a4af37d5ce180fba5))
* add allow-missing-origin optional switch ([#696](https://github.com/butlerx/wetty/issues/696)) ([15f2bdb](https://github.com/butlerx/wetty/commit/15f2bdb4e0d1804aca9541ee45861ef242338d9a))
* address final reliability review findings ([2a84443](https://github.com/butlerx/wetty/commit/2a8444392211f182479315ffd6cd168377d44378))
* bump dependencies ([1161894](https://github.com/butlerx/wetty/commit/116189487c52759afec2b40ff293631f64e1fb6e))
* **client:** dispose terminal sessions on reconnect ([418b3e2](https://github.com/butlerx/wetty/commit/418b3e2ab20430489a29ab1d8cd5e7a9797d9558))
* **client:** secure editor message channel ([6bd70fc](https://github.com/butlerx/wetty/commit/6bd70fc1ef7774fed9b96760c99c5fa77740c92a))
* **config:** isolate configuration state ([73bb99c](https://github.com/butlerx/wetty/commit/73bb99ca20dbf38ee4f2508c401eb611ccf91900))
* **config:** save the first options change ([4de3db9](https://github.com/butlerx/wetty/commit/4de3db94a0ac076cbb5efe152e8b15bf2fd6a49a))
* correct typos in documentation across multiple files ([222dc49](https://github.com/butlerx/wetty/commit/222dc49c8cd30f743cc65091d5dd425b8676e753))
* Docker CLI flag forwarding in runtime image ([#600](https://github.com/butlerx/wetty/issues/600)) ([21133cc](https://github.com/butlerx/wetty/commit/21133cc51def918d3749cf048efd82cdf4fda2cd))
* **docker:** resolve build failures for native modules and production deps ([6713d33](https://github.com/butlerx/wetty/commit/6713d33d26d61fbfff03d2f5fc301695e2892a6a))
* **docker:** resolve native module build failures in production dependencies ([#572](https://github.com/butlerx/wetty/issues/572)) ([6713d33](https://github.com/butlerx/wetty/commit/6713d33d26d61fbfff03d2f5fc301695e2892a6a))
* forward binary mouse input to PTY ([#630](https://github.com/butlerx/wetty/issues/630)) ([#699](https://github.com/butlerx/wetty/issues/699)) ([ab1eb68](https://github.com/butlerx/wetty/commit/ab1eb687774a7fa6961bbe83901159ab1eaf7133))
* keep the SSH password out of the debug log ([#686](https://github.com/butlerx/wetty/issues/686)) ([e1d5f2a](https://github.com/butlerx/wetty/commit/e1d5f2a974242faa3796f7fc7d91f24fbfc4dc13))
* Potential fix for code scanning alert no. 6: Server-side URL redirect ([#597](https://github.com/butlerx/wetty/issues/597)) ([4479247](https://github.com/butlerx/wetty/commit/4479247384fd42c0dbf90e36d39958bd2679d27a))
* prevent ReDoS in trailing slash regex ([c1c21cc](https://github.com/butlerx/wetty/commit/c1c21cc6b7d7213e00891dbe5c6dc348130f882a))
* prevent XSS in file download toast notification ([386e432](https://github.com/butlerx/wetty/commit/386e43211c5d8784158d943d814669a78a4ce88d))
* **security:** accept same-origin polling without Origin ([4302f3c](https://github.com/butlerx/wetty/commit/4302f3ce4111e803be49519c5a9d82459595e4c3)), closes [#695](https://github.com/butlerx/wetty/issues/695)
* **security:** pin browser origins and bound HTTP metrics ([08e8abd](https://github.com/butlerx/wetty/commit/08e8abdacffccc6ba165abc915d1df8f2753e7a1))
* **security:** quote SSH working directory paths ([5cc2ef5](https://github.com/butlerx/wetty/commit/5cc2ef5b319ac116415d4854c5eb4b23da570d3e))
* **security:** validate Socket.IO request origins ([d73f2c0](https://github.com/butlerx/wetty/commit/d73f2c0c6c02cf9134028508e8d2f5f1c92c20c6))
* **server:** bound PTY termination escalation ([2f537a5](https://github.com/butlerx/wetty/commit/2f537a514f3fd644e011c57684235d2accf9ac12))
* **server:** own socket session cleanup ([c816629](https://github.com/butlerx/wetty/commit/c8166293d732c9e5bb94fac9675cbbd4af59c43d))
* use sudo - some typos - how to update node ([b87ce6c](https://github.com/butlerx/wetty/commit/b87ce6c4d258a38943fa54bdf5a6c3f849d65e36))
* use sudo - some typos - how to update node ([fccc41c](https://github.com/butlerx/wetty/commit/fccc41c5c123576425231329fec0a9c84a1bff43))
* use textContent in disconnect overlay message ([6751aa4](https://github.com/butlerx/wetty/commit/6751aa4dcbe0fe05e94a5f66ddbc978148f2e44a))
* validate client resize payload before resizing the PTY ([#685](https://github.com/butlerx/wetty/issues/685)) ([06cc0b7](https://github.com/butlerx/wetty/commit/06cc0b7d5d7c3f5698b2e487d0b8b922459ee0d6))
* validate redirect URL to prevent open redirect vulnerability ([4479247](https://github.com/butlerx/wetty/commit/4479247384fd42c0dbf90e36d39958bd2679d27a))


### Code Improvements

* **client:** add terminal feature entrypoint ([63f6b42](https://github.com/butlerx/wetty/commit/63f6b42ae57f6a4cae6355748926f1a6549c6453))
* **client:** relocate configuration editor sources ([05e8249](https://github.com/butlerx/wetty/commit/05e8249c416f5beecd99fb36cc3077f289baee3f))
* **client:** type the configuration editor ([6240cb6](https://github.com/butlerx/wetty/commit/6240cb68f626954925e9671079da4eea34d2d10b))
* **server:** add explicit feature entrypoints ([24f4f35](https://github.com/butlerx/wetty/commit/24f4f355e00609d6192396933d9812f25ed2461a))
* **server:** clarify module ownership ([6c231ef](https://github.com/butlerx/wetty/commit/6c231efcf870e0e9cc904d3eb11b12da72162895))


### Documentation

* Add [@deanshub](https://github.com/deanshub) as a contributor ([5bf2535](https://github.com/butlerx/wetty/commit/5bf2535303b862b24ad0573c4b5e0095a55374e7))
* Add [@janoskk](https://github.com/janoskk) as a contributor ([acb4abe](https://github.com/butlerx/wetty/commit/acb4abe03879a3126fc2c09b44510af0da538bb3))
* Add [@kmlucy](https://github.com/kmlucy) as a contributor ([72ebafe](https://github.com/butlerx/wetty/commit/72ebafee117d2ccb25a036f868f666ccd76bef29))
* Add [@lozbrown](https://github.com/lozbrown)  as a contributor ([93e1c3d](https://github.com/butlerx/wetty/commit/93e1c3d0537b1d28910a880d837c9c61e4b6f30e))
* Add [@sergeir82](https://github.com/sergeir82) as a contributor ([646806f](https://github.com/butlerx/wetty/commit/646806fa33395cba4bae27e28927beedf792ecc9))
* Add [@userdocs](https://github.com/userdocs) as a contributor ([0ade4e8](https://github.com/butlerx/wetty/commit/0ade4e8ba3659f5676e0f1ad75766678ec37c887))
* Add @DefunctLizard as a contributor ([65b48ac](https://github.com/butlerx/wetty/commit/65b48aca734f5699306e2b89591ec5d93e216902))
* Add @LeszekBlazewski as a contributor ([71cb059](https://github.com/butlerx/wetty/commit/71cb0593c31f4632c9e6b209aaad11937e453dea))
* align configuration docs with current runtime defaults ([#598](https://github.com/butlerx/wetty/issues/598)) ([8a66e8d](https://github.com/butlerx/wetty/commit/8a66e8d20520a4a5b29f2db1cb60c18799a528cd))
* align docs with current config defaults ([8a66e8d](https://github.com/butlerx/wetty/commit/8a66e8d20520a4a5b29f2db1cb60c18799a528cd))
* clarify nginx Connection header — variable vs literal string ([#669](https://github.com/butlerx/wetty/issues/669)) ([09e643a](https://github.com/butlerx/wetty/commit/09e643a56ae26779db5bc8fde2dd11db300231c3))
* plan runtime boundary hardening ([dc0db1f](https://github.com/butlerx/wetty/commit/dc0db1f6b630fe15caf2106ba417f30af74f3baf))
* update docsify to v5 ([469fe68](https://github.com/butlerx/wetty/commit/469fe68cc382dd06f8e13142c31a8654a8be4374))
