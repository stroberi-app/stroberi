# patches

The `postinstall` script runs `patch-package`, which applies every `*.patch`
file in this directory on install. To add a local fix for a dependency, run
`yarn patch-package <package-name>` and commit the generated `.patch` file.

## Current patches

Both are security backports for transitive dependencies whose fixed releases
can't be used directly. `yarn npm audit` keeps flagging them because it only
compares version numbers; remove each patch once the dependent package moves
to a fixed release line.

- `image-size+1.2.1.patch` — Backports the infinite-loop fixes for ICNS and JXL
  parsing (GHSA-w3rx-r6r6-pgpr, GHSA-5p2g-fcmc-qvqq) from `image-size@2.0.4`.
  Metro 0.83 needs `image-size@^1`, and 2.x drops the file-path API that Metro
  calls.
- `decode-uri-component+0.2.2.patch` — Backports the linear-time decoder for
  malformed input (GHSA-vcc3-ghjq-m6fr) from `decode-uri-component@0.5.0`.
  `query-string@7` (used by `expo-router` and React Navigation) `require()`s
  this package, and 0.5.0 is ESM-only.
