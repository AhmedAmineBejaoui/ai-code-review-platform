#!/usr/bin/env node

const fs = require("node:fs");
const { PDFParse } = require("pdf-parse");

async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    process.stderr.write(JSON.stringify({ ok: false, error: "Missing PDF file path." }));
    process.exit(1);
    return;
  }

  let parser;

  try {
    parser = new PDFParse({ data: fs.readFileSync(filePath) });
    const result = await parser.getText();
    process.stdout.write(
      JSON.stringify({
        ok: true,
        text: typeof result.text === "string" ? result.text : "",
      }),
    );
  } catch (error) {
    process.stderr.write(
      JSON.stringify({
        ok: false,
        error: error && typeof error.message === "string" ? error.message : String(error),
      }),
    );
    process.exitCode = 1;
  } finally {
    if (parser && typeof parser.destroy === "function") {
      try {
        await parser.destroy();
      } catch {
        // Best-effort cleanup only.
      }
    }
  }
}

main().catch((error) => {
  process.stderr.write(
    JSON.stringify({
      ok: false,
      error: error && typeof error.message === "string" ? error.message : String(error),
    }),
  );
  process.exit(1);
});
