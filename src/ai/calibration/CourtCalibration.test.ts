import { describe, expect, it } from "vitest";
import { CourtCalibration } from "@/src/ai/calibration/CourtCalibration";
import type { CourtCalibrationReference } from "@/src/ai/types";

describe("CourtCalibration", () => {
  it("projette un rectangle calibré et mesure une distance en mètres", () => {
    const service = new CourtCalibration();
    const calibration = service.calibrate({
      imageSize: { width: 1000, height: 1000 },
      references: references(),
      basketCourtPointMeters: { x: 5, y: 0 },
    });

    expect(calibration.status).toBe("calibrated");
    expect(calibration.confidence).toBeGreaterThanOrEqual(0.8);
    const center = service.imageToCourt(calibration, { x: 500, y: 500 });
    expect(center?.x).toBeCloseTo(5, 5);
    expect(center?.y).toBeCloseTo(5, 5);

    const distance = service.estimateShotDistance(calibration, { x: 500, y: 1000 });
    expect(distance.status).toBe("measured");
    expect(distance.value).toBeCloseTo(10, 2);
    expect(distance.unit).toBe("m");
  });

  it("refuse une calibration avec moins de quatre repères", () => {
    const calibration = new CourtCalibration().calibrate({
      imageSize: { width: 1000, height: 1000 },
      references: references().slice(0, 3),
    });

    expect(calibration.status).toBe("insufficient_points");
    expect(calibration.homography).toBeNull();
  });

  it("ne publie aucune distance sans panier référencé", () => {
    const service = new CourtCalibration();
    const calibration = service.calibrate({
      imageSize: { width: 1000, height: 1000 },
      references: references(),
    });

    expect(service.estimateShotDistance(calibration, { x: 500, y: 800 }).status).toBe("unavailable");
  });

  it("refuse une calibration dont les repères se contredisent fortement", () => {
    const calibration = new CourtCalibration().calibrate({
      imageSize: { width: 1000, height: 1000 },
      references: [
        ...references(),
        ref("bad-center", 500, 500, 25, 25),
      ],
    });

    expect(calibration.status).toBe("low_confidence");
    expect(calibration.reprojectionErrorPx).toBeGreaterThan(8);
  });
});

function references(): CourtCalibrationReference[] {
  return [
    ref("near-left", 0, 1000, 0, 10),
    ref("near-right", 1000, 1000, 10, 10),
    ref("far-right", 1000, 0, 10, 0),
    ref("far-left", 0, 0, 0, 0),
  ];
}

function ref(id: string, imageX: number, imageY: number, courtX: number, courtY: number): CourtCalibrationReference {
  return {
    id,
    imagePoint: { x: imageX, y: imageY },
    courtPointMeters: { x: courtX, y: courtY },
    confidence: 0.95,
    source: "manual_reference",
  };
}
