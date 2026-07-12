# patches

This directory is intentionally empty.

The `postinstall` script runs `patch-package`, which is a no-op while no patch
files are present here. The setup is kept in place so that if a dependency ever
needs a local fix, you can run `yarn patch-package <package-name>` and the
generated `*.patch` file will be applied automatically on install.

If you are adding the first patch, drop the generated `.patch` file in this
directory — no further configuration is required.
