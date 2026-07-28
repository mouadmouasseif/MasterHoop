import { describe, expect, it } from "vitest";

import { calculateFrameVisualStats } from "@/src/services/videoFrameAnalysisService";

function image(width: number, height: number, values: number[]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const value = values[index] ?? 0;
    data[index * 4] = value;
    data[index * 4 + 1] = value;
    data[index * 4 + 2] = value;
    data[index * 4 + 3] = 255;
  }
  return { width, height, data, colorSpace: "srgb" } as ImageData;
}

describe("videoFrameAnalysisService", () => {
  it("mesure la luminosité moyenne d'une image", () => {
    const stats = calculateFrameVisualStats(image(2, 2, [100, 100, 100, 100]));

    expect(stats.brightness).toBe(100);
    expect(stats.contrast).toBe(0);
  });

  it("détecte davantage de contraste sur une image alternée", () => {
    const flat = calculateFrameVisualStats(image(4, 4, Array(16).fill(100)));
    const contrasted = calculateFrameVisualStats(
      image(4, 4, Array.from({ length: 16 }, (_, index) => (index % 2 ? 240 : 10))),
    );

    expect(contrasted.contrast).toBeGreaterThan(flat.contrast);
    expect(contrasted.sharpness).toBeGreaterThan(flat.sharpness);
  });
});
