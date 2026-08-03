import { pathToFileURL } from "node:url";

import { runCaseCliV1 } from "./case-cli-v1.ts";

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = await runCaseCliV1({
    argv: process.argv.slice(2),
    env: process.env,
    stdout: (line) => console.log(line),
    stderr: (line) => console.error(line),
  });
}
