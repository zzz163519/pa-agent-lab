# Third-Party Notices

PA Agent Lab keeps third-party runtime dependencies narrowly scoped and pinned by `pnpm-lock.yaml`.

## resvg-js

- Packages: `@resvg/resvg-js@2.6.2` and `@resvg/resvg-js-linux-x64-gnu@2.6.2`
- Project: [resvg-js](https://github.com/thx/resvg-js)
- Source release: [v2.6.2](https://github.com/thx/resvg-js/tree/v2.6.2)
- License: [Mozilla Public License 2.0](https://github.com/thx/resvg-js/blob/v2.6.2/LICENSE)
- Use: unmodified SVG-to-PNG rasterization dependency for the ADR-0012 anonymous chart renderer

PA Agent Lab does not copy or modify resvg-js source files. Installed packages retain their own license files and notices. The repository does not commit `node_modules` or native binaries.
