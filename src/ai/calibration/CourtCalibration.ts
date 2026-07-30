import type {
  CourtCalibrationReference,
  CourtGeometry,
  MetricResult,
  Point2D,
} from "@/src/ai/types";

const MIN_REFERENCE_CONFIDENCE = 0.6;
const MIN_COVERAGE = 0.04;
const MAX_REPROJECTION_ERROR_PX = 8;

export interface CourtCalibrationInput {
  imageSize: { width: number; height: number };
  references: CourtCalibrationReference[];
  basketCourtPointMeters?: Point2D;
}

export class CourtCalibration {
  calibrate(input: CourtCalibrationInput): CourtGeometry {
    const references = input.references.filter(isFiniteReference);
    const source = references.some((reference) => reference.source === "validated_vision_model")
      ? "validated_vision_model"
      : "manual_reference";
    const base = {
      calibrationId: calibrationId(input),
      confidence: 0,
      source,
      homography: null,
      imageSize: input.imageSize,
      referenceCount: references.length,
      reprojectionErrorPx: null,
      coverage: 0,
      basketCourtPointMeters: input.basketCourtPointMeters,
      limitations: [] as string[],
    } satisfies Omit<CourtGeometry, "status">;

    if (references.length < 4) {
      return {
        ...base,
        status: "insufficient_points",
        limitations: ["Quatre repères terrain fiables sont requis pour calibrer le plan."],
      };
    }

    if (
      !validImageSize(input.imageSize) ||
      !hasUniquePoints(references) ||
      references.some((reference) => !isReferenceInBounds(reference, input.imageSize))
    ) {
      return {
        ...base,
        status: "invalid_geometry",
        limitations: ["Les repères ou les dimensions de l’image ne définissent pas une géométrie valide."],
      };
    }

    const imageArea = polygonArea(convexHull(references.map((reference) => reference.imagePoint)));
    const courtArea = polygonArea(convexHull(references.map((reference) => reference.courtPointMeters)));
    const coverage = clamp01(imageArea / (input.imageSize.width * input.imageSize.height));
    if (coverage < MIN_COVERAGE || courtArea < 1) {
      return {
        ...base,
        coverage,
        status: "invalid_geometry",
        limitations: ["Les repères sont trop rapprochés ou presque alignés pour une calibration stable."],
      };
    }

    const homography = solveHomography(references);
    if (!homography) {
      return {
        ...base,
        coverage,
        status: "invalid_geometry",
        limitations: ["La transformation terrain n’a pas pu être calculée avec ces repères."],
      };
    }

    const courtErrorMeters = mean(references.map((reference) => {
      const courtPoint = projectPoint(homography, reference.imagePoint);
      return courtPoint
        ? distance(courtPoint, reference.courtPointMeters)
        : Number.POSITIVE_INFINITY;
    }));
    const approximatePixelsPerMeter = Math.sqrt(imageArea / courtArea);
    const reprojectionErrorPx = courtErrorMeters * approximatePixelsPerMeter;
    const averageReferenceConfidence = mean(references.map((reference) => reference.confidence));
    const geometryScore = Math.min(1, coverage / 0.18);
    const errorScore = clamp01(1 - reprojectionErrorPx / MAX_REPROJECTION_ERROR_PX);
    const confidence = clamp01(averageReferenceConfidence * 0.65 + geometryScore * 0.2 + errorScore * 0.15);
    const limitations: string[] = [];

    if (references.some((reference) => reference.confidence < MIN_REFERENCE_CONFIDENCE)) {
      limitations.push("Au moins un repère est sous le seuil de confiance de 0,60.");
    }
    if (reprojectionErrorPx > MAX_REPROJECTION_ERROR_PX) {
      limitations.push("L’erreur de reprojection dépasse 8 pixels.");
    }
    if (confidence < MIN_REFERENCE_CONFIDENCE) {
      limitations.push("La confiance globale de calibration est inférieure à 0,60.");
    }

    const status = limitations.length ? "low_confidence" : "calibrated";
    return {
      ...base,
      status,
      confidence,
      homography,
      coverage,
      reprojectionErrorPx,
      limitations,
    };
  }

  imageToCourt(calibration: CourtGeometry, imagePoint: Point2D): Point2D | null {
    if (calibration.status !== "calibrated" || !calibration.homography) return null;
    return projectPoint(calibration.homography, imagePoint);
  }

  estimateShotDistance(
    calibration: CourtGeometry | null,
    shooterFloorImagePoint: Point2D | null,
  ): MetricResult {
    if (
      !calibration ||
      calibration.status !== "calibrated" ||
      !calibration.homography ||
      !calibration.basketCourtPointMeters ||
      !shooterFloorImagePoint
    ) {
      return unavailableDistance(
        !calibration?.basketCourtPointMeters
          ? "Position du panier au sol non fournie dans la calibration."
          : "Calibration valide et pieds du joueur au relâchement requis.",
      );
    }

    const shooter = this.imageToCourt(calibration, shooterFloorImagePoint);
    if (!shooter) return unavailableDistance("Le point du joueur ne peut pas être projeté sur le terrain.");
    const value = distance(shooter, calibration.basketCourtPointMeters);
    if (!Number.isFinite(value) || value > 40) {
      return unavailableDistance("Distance projetée hors des limites plausibles d’un terrain.");
    }

    return {
      value: Number(value.toFixed(2)),
      unit: "m",
      confidence: calibration.confidence,
      source: `court_homography:${calibration.calibrationId}`,
      status: calibration.confidence >= 0.75 ? "measured" : "estimated",
      limitations: calibration.confidence < 0.75
        ? ["Distance issue d’une calibration dont la confiance reste modérée."]
        : [],
    };
  }
}

function unavailableDistance(message: string): MetricResult {
  return {
    value: null,
    unit: "m",
    confidence: 0,
    source: "unavailable_without_calibration",
    status: "unavailable",
    limitations: [message],
  };
}

function solveHomography(
  references: CourtCalibrationReference[],
): CourtGeometry["homography"] {
  const rows: number[][] = [];
  const targets: number[] = [];
  for (const reference of references) {
    const { x, y } = reference.imagePoint;
    const { x: courtX, y: courtY } = reference.courtPointMeters;
    rows.push([x, y, 1, 0, 0, 0, -x * courtX, -y * courtX]);
    targets.push(courtX);
    rows.push([0, 0, 0, x, y, 1, -x * courtY, -y * courtY]);
    targets.push(courtY);
  }

  const normal = Array.from({ length: 8 }, () => Array<number>(8).fill(0));
  const rhs = Array<number>(8).fill(0);
  for (let row = 0; row < rows.length; row += 1) {
    const weight = references[Math.floor(row / 2)].confidence;
    for (let column = 0; column < 8; column += 1) {
      rhs[column] += rows[row][column] * targets[row] * weight;
      for (let inner = 0; inner < 8; inner += 1) {
        normal[column][inner] += rows[row][column] * rows[row][inner] * weight;
      }
    }
  }
  const solution = gaussianSolve(normal, rhs);
  if (!solution) return null;
  return [...solution, 1] as CourtGeometry["homography"];
}

function gaussianSolve(matrix: number[][], values: number[]): number[] | null {
  const size = values.length;
  const augmented = matrix.map((row, index) => [...row, values[index]]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    if (Math.abs(augmented[pivot][column]) < 1e-10) return null;
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    for (let index = column; index <= size; index += 1) augmented[column][index] /= divisor;
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let index = column; index <= size; index += 1) {
        augmented[row][index] -= factor * augmented[column][index];
      }
    }
  }
  return augmented.map((row) => row[size]);
}

function projectPoint(matrix: NonNullable<CourtGeometry["homography"]>, point: Point2D): Point2D | null {
  const denominator = matrix[6] * point.x + matrix[7] * point.y + matrix[8];
  if (Math.abs(denominator) < 1e-10) return null;
  return {
    x: (matrix[0] * point.x + matrix[1] * point.y + matrix[2]) / denominator,
    y: (matrix[3] * point.x + matrix[4] * point.y + matrix[5]) / denominator,
  };
}

function calibrationId(input: CourtCalibrationInput): string {
  const serialized = input.references
    .map((reference) => `${reference.id}:${reference.imagePoint.x},${reference.imagePoint.y}:${reference.courtPointMeters.x},${reference.courtPointMeters.y}`)
    .sort()
    .join("|");
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `court-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function hasUniquePoints(references: CourtCalibrationReference[]): boolean {
  const image = new Set(references.map((reference) => `${reference.imagePoint.x}:${reference.imagePoint.y}`));
  const court = new Set(references.map((reference) => `${reference.courtPointMeters.x}:${reference.courtPointMeters.y}`));
  return image.size >= 4 && court.size >= 4;
}

function isFiniteReference(reference: CourtCalibrationReference): boolean {
  return [
    reference.imagePoint.x,
    reference.imagePoint.y,
    reference.courtPointMeters.x,
    reference.courtPointMeters.y,
    reference.confidence,
  ].every(Number.isFinite) && reference.confidence >= 0 && reference.confidence <= 1;
}

function isReferenceInBounds(
  reference: CourtCalibrationReference,
  imageSize: { width: number; height: number },
): boolean {
  return reference.imagePoint.x >= 0 &&
    reference.imagePoint.y >= 0 &&
    reference.imagePoint.x <= imageSize.width &&
    reference.imagePoint.y <= imageSize.height;
}

function validImageSize(size: { width: number; height: number }): boolean {
  return Number.isFinite(size.width) && Number.isFinite(size.height) && size.width > 0 && size.height > 0;
}

function convexHull(points: Point2D[]): Point2D[] {
  const sorted = [...points].sort((left, right) => left.x - right.x || left.y - right.y);
  const cross = (origin: Point2D, left: Point2D, right: Point2D) =>
    (left.x - origin.x) * (right.y - origin.y) - (left.y - origin.y) * (right.x - origin.x);
  const lower: Point2D[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower.at(-2)!, lower.at(-1)!, point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper: Point2D[] = [];
  for (const point of sorted.reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2)!, upper.at(-1)!, point) <= 0) upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function polygonArea(points: Point2D[]): number {
  if (points.length < 3) return 0;
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
}

function distance(left: Point2D, right: Point2D): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
