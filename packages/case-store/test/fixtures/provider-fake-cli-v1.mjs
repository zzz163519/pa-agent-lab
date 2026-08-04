import { spawn } from "node:child_process";

const mode = process.argv[2];

const envelope = (terminalJson, usage = null, toolOrSubagentUsed = false) =>
  JSON.stringify({
    schemaVersion: "provider-cli-terminal-envelope.v1",
    event: "terminal_result",
    terminalJson,
    usage,
    toolOrSubagentUsed,
  });

switch (mode) {
  case "success":
    process.stdout.write(
      envelope(
        '{"humanSummary":null,"plannedGeometry":null,"verdict":"no_trade"}',
        { inputTokens: 100, outputTokens: 20, cacheReadTokens: null },
      ),
    );
    break;
  case "zero-usage":
    process.stdout.write(
      envelope("{}", {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
      }),
    );
    break;
  case "tool-event":
    process.stdout.write(envelope("{}", null, true));
    break;
  case "unknown-event":
    process.stdout.write(
      JSON.stringify({
        schemaVersion: "provider-cli-terminal-envelope.v1",
        event: "progress",
        terminalJson: "{}",
        usage: null,
        toolOrSubagentUsed: false,
      }),
    );
    break;
  case "multiple":
    process.stdout.write(`${envelope("{}")}\n${envelope("{}")}`);
    break;
  case "prose":
    process.stdout.write(`done: ${envelope("{}")}`);
    break;
  case "ansi":
    process.stdout.write(`\u001b[32m${envelope("{}")}\u001b[0m`);
    break;
  case "partial":
    process.stdout.write('{"schemaVersion":"provider-cli-terminal-envelope.v1"');
    break;
  case "invalid-utf8":
    process.stdout.write(Buffer.from([0xc3, 0x28]));
    break;
  case "stdout-overflow":
    process.stdout.write("x".repeat(270000));
    break;
  case "stderr":
    process.stderr.write("unexpected diagnostic");
    break;
  case "stderr-overflow":
    process.stderr.write("x".repeat(70000));
    break;
  case "transport-error":
    process.exitCode = 17;
    break;
  case "hang-with-child": {
    const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
      stdio: "ignore",
    });
    process.stdout.write(String(child.pid));
    setInterval(() => {}, 1000);
    break;
  }
  case "hang-with-resistant-child": {
    const child = spawn(
      process.execPath,
      [
        "-e",
        "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)",
      ],
      { stdio: "ignore" },
    );
    process.stdout.write(String(child.pid));
    setInterval(() => {}, 1000);
    break;
  }
  default:
    process.exitCode = 64;
}
