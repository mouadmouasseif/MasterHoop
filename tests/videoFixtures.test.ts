import ffmpeg from "@ffmpeg-installer/ffmpeg";
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

type FixtureManifest = {
  license: string;
  containsRealPeople: boolean;
  containsPersonalData: boolean;
  fixtures: Array<{ file: string; condition: string; expected: Record<string, unknown> }>;
};

const fixtureDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures", "videos");
const width = 320;
const height = 180;
const manifest = JSON.parse(
  readFileSync(resolve(fixtureDirectory, "manifest.json"), "utf8"),
) as FixtureManifest;

describe("authorized synthetic video fixtures", () => {
  it("documents provenance, privacy and expected conditions", () => {
    expect(manifest.license).toBe("CC0-1.0");
    expect(manifest.containsRealPeople).toBe(false);
    expect(manifest.containsPersonalData).toBe(false);
    expect(manifest.fixtures.map((fixture) => fixture.condition)).toEqual([
      "synthetic_complete_arc",
      "ball_absent",
      "low_light",
      "temporary_ball_loss",
    ]);
  });

  it("contains valid non-empty WebM containers", () => {
    for (const fixture of manifest.fixtures) {
      const path = resolve(fixtureDirectory, fixture.file);
      const header = readFileSync(path).subarray(0, 4);
      expect([...header]).toEqual([0x1a, 0x45, 0xdf, 0xa3]);
      expect(statSync(path).size).toBeGreaterThan(500);
    }
  });

  it("separates the low-light fixture at the production threshold", () => {
    const completeBrightness = average([...decode("shot-complete-synthetic.webm", "gray")]);
    const lowLightBrightness = average([...decode("low-light-synthetic.webm", "gray")]);

    expect(completeBrightness).toBeGreaterThanOrEqual(55);
    expect(lowLightBrightness).toBeLessThan(55);
  }, 20_000);

  it("preserves the expected ball visibility and temporary tracking loss", () => {
    const complete = orangePixelsPerFrame(decode("shot-complete-synthetic.webm", "rgb24"));
    const absent = orangePixelsPerFrame(decode("ball-absent-synthetic.webm", "rgb24"));
    const trackingLoss = orangePixelsPerFrame(decode("tracking-loss-synthetic.webm", "rgb24"));

    expect(complete.filter((count) => count >= 100).length).toBeGreaterThanOrEqual(complete.length * 0.8);
    expect(absent.every((count) => count < 10)).toBe(true);
    expect(trackingLoss.some((count) => count < 10)).toBe(true);
    expect(trackingLoss.some((count) => count >= 100)).toBe(true);
  }, 20_000);
});

function decode(file: string, pixelFormat: "gray" | "rgb24"): Buffer {
  return execFileSync(ffmpeg.path, [
    "-hide_banner",
    "-loglevel", "error",
    "-i", resolve(fixtureDirectory, file),
    "-an",
    "-f", "rawvideo",
    "-pix_fmt", pixelFormat,
    "pipe:1",
  ], { maxBuffer: 20 * 1024 * 1024 });
}

function orangePixelsPerFrame(video: Buffer): number[] {
  const frameBytes = width * height * 3;
  const counts: number[] = [];
  for (let frameOffset = 0; frameOffset + frameBytes <= video.length; frameOffset += frameBytes) {
    let count = 0;
    for (let offset = frameOffset; offset < frameOffset + frameBytes; offset += 3) {
      const red = video[offset];
      const green = video[offset + 1];
      const blue = video[offset + 2];
      if (red > 170 && green > 35 && green < 160 && blue < 90) count += 1;
    }
    counts.push(count);
  }
  return counts;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
