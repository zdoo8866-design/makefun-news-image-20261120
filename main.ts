// Entry point for the make.fun "news-image-20261120" submission.
//
// The artwork itself is entry.png in this directory: a 1024x1024 front
// page that sums up the world news of 20 November 2026 in six panels.
// Running this program stages the image into the output directory
// ($MAKEFUN_OUTPUT_DIR, which the grader sets to /output; the repository
// itself is mounted read-only there) and verifies the staged copy
// against the competition's intake limits (PNG format, at most
// 1024x1024 pixels, at most 1 MiB on disk).

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_BYTES = 1024 * 1024; // 1 MiB intake cap
const MAX_DIM = 1024; // width and height cap in pixels

const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(here, "entry.png");
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const outputPath = join(outputDir, "entry.png");

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

if (!existsSync(sourcePath)) {
  fail(`entry.png not found next to main.ts (${sourcePath})`);
}

const bytes = readFileSync(sourcePath);
if (bytes.length === 0) fail("entry.png is empty");
if (bytes.length > MAX_BYTES) {
  fail(`entry.png is ${bytes.length} bytes, over the 1 MiB limit`);
}

// The first eight bytes of a PNG file are a fixed signature.
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const isPng = PNG_SIGNATURE.every((byte, i) => bytes[i] === byte);
if (!isPng) fail("entry.png does not start with the PNG signature");

// The IHDR chunk follows the signature: 4 bytes of chunk length, the
// literal "IHDR", then width and height as big-endian uint32 values.
const chunkType = bytes.subarray(12, 16).toString("ascii");
if (chunkType !== "IHDR") fail(`expected IHDR chunk, found "${chunkType}"`);
const width = bytes.readUInt32BE(16);
const height = bytes.readUInt32BE(20);
if (width > MAX_DIM || height > MAX_DIM) {
  fail(`entry.png is ${width}x${height}, over the ${MAX_DIM}x${MAX_DIM} limit`);
}

mkdirSync(outputDir, { recursive: true });
copyFileSync(sourcePath, outputPath);

const staged = statSync(outputPath);
if (staged.size !== bytes.length) {
  fail(`staged copy is ${staged.size} bytes, source is ${bytes.length}`);
}

// Hash both files so a truncated or corrupted copy cannot slip through.
const digest = (path: string) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");
const sourceHash = digest(sourcePath);
if (digest(outputPath) !== sourceHash) {
  fail("staged copy hashes differently from the source");
}

console.log(`entry.png: ${bytes.length} bytes, ${width}x${height}, PNG signature ok`);
console.log(`sha256: ${sourceHash}`);
console.log(`staged at ${outputPath}`);
