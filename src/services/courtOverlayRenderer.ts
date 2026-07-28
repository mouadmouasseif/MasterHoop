import type { CourtScanResult } from "@/src/types/courtVision";

export function renderCourtOverlay(ctx: CanvasRenderingContext2D, scan: CourtScanResult) {
  const { width: w, height: h } = scan;
  ctx.save();

  ctx.fillStyle = scan.cameraStatus === "good" ? "rgba(0, 0, 0, 0.10)" : "rgba(255, 107, 0, 0.08)";
  ctx.fillRect(0, 0, w, h);

  drawHoop(ctx, scan);
  drawBallTrail(ctx, scan);
  drawPlayerZone(ctx, scan);
  drawStatus(ctx, scan);

  ctx.restore();
}

function drawHoop(ctx: CanvasRenderingContext2D, scan: CourtScanResult) {
  const { x, y } = scan.hoop.position;
  ctx.strokeStyle = "rgba(255, 107, 0, 0.84)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y, 28, 10, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = "800 10px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.round(scan.hoop.confidence * 100)}%`, x, y - 18);
}

function drawBallTrail(ctx: CanvasRenderingContext2D, scan: CourtScanResult) {
  scan.ball.trail.forEach((point, index) => {
    const alpha = (index + 1) / Math.max(1, scan.ball.trail.length);
    ctx.fillStyle = `rgba(0, 255, 148, ${0.12 + alpha * 0.55})`;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4 + alpha * 7, 0, Math.PI * 2);
    ctx.fill();
  });

  if (scan.ball.position) {
    ctx.strokeStyle = "rgba(0, 255, 148, 0.86)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(scan.ball.position.x, scan.ball.position.y, 18, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawPlayerZone(ctx: CanvasRenderingContext2D, scan: CourtScanResult) {
  const center = scan.player.center;
  if (!center) return;
  ctx.strokeStyle = "rgba(47, 128, 255, 0.76)";
  ctx.fillStyle = "rgba(47, 128, 255, 0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center.x, center.y, Math.max(36, scan.width * 0.045), 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawStatus(ctx: CanvasRenderingContext2D, scan: CourtScanResult) {
  const label = scan.shotZone === "threePoint" ? "3 POINTS" : scan.shotZone === "near" ? "PROCHE" : scan.shotZone === "midRange" ? "MI-DISTANCE" : "SCAN";
  const x = 18;
  const y = scan.height - 58;
  const width = Math.min(scan.width - 36, 360);
  ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
  ctx.beginPath();
  ctx.roundRect(x, y, width, 42, 14);
  ctx.fill();
  ctx.fillStyle = scan.cameraStatus === "good" ? "#00FF94" : "#FF6B00";
  ctx.font = "900 12px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`${label} | CONFIANCE ${Math.round(Math.max(scan.ball.confidence, scan.player.confidence) * 100)}%`, x + 14, y + 17);
  ctx.fillStyle = "rgba(255,255,255,0.66)";
  ctx.font = "700 10px Inter, sans-serif";
  ctx.fillText(scan.message.slice(0, 54), x + 14, y + 32);
}
