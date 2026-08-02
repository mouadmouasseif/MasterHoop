import type { TrainingSession } from "@/src/services/sessionService";
import { basketmotionFilename, BRAND_NAME } from "@/src/shared/brand";

type ExportBundle = {
  player?: string;
  sessions: TrainingSession[];
  recommendations?: string[];
};

const downloadBlob = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export function exportSessionsCsv({ sessions }: ExportBundle) {
  const header = ["id", "date", "type", "player", "score", "video", "weaknesses", "recommendations"];
  const rows = sessions.map((session) => [
    session.id,
    formatDate(session.createdAt),
    session.drillName,
    session.playerName || "Player",
    session.score,
    session.videoUrl,
    session.weaknesses.join("; "),
    (session.recommendations || session.suggestions).join("; "),
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  downloadBlob(basketmotionFilename("sessions", "csv"), new Blob([csv], { type: "text/csv;charset=utf-8" }));
}

export function exportProfessionalPdf({ player = "BasketMotion Player", sessions, recommendations = [] }: ExportBundle) {
  const latest = sessions[0];
  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${BRAND_NAME} Report</title>
      <style>
        body { font-family: Inter, Arial, sans-serif; background: #0A0A0B; color: white; padding: 32px; }
        h1 { color: #FF6B00; letter-spacing: .08em; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .card { border: 1px solid rgba(255,255,255,.14); border-radius: 14px; padding: 16px; background: #161617; }
        .score { font-size: 42px; color: #00FF94; font-weight: 900; }
        table { width: 100%; border-collapse: collapse; margin-top: 24px; }
        td, th { border-bottom: 1px solid rgba(255,255,255,.12); padding: 10px; text-align: left; }
      </style>
    </head>
    <body>
      <h1>${BRAND_NAME} REPORT</h1>
      <p>Joueur: <strong>${player}</strong></p>
      <div class="grid">
        <div class="card"><div>Sessions</div><div class="score">${sessions.length}</div></div>
        <div class="card"><div>Score IA</div><div class="score">${latest?.score ?? 0}</div></div>
        <div class="card"><div>Vitesse</div><div class="score">${latest?.advancedAnalysis?.report.speed ?? "Indisponible"}</div></div>
        <div class="card"><div>Distance</div><div class="score">${latest?.advancedAnalysis?.report.distance ?? "Indisponible"}</div></div>
      </div>
      <h2>Recommandations IA</h2>
      <ul>${recommendations.map((item) => `<li>${item}</li>`).join("")}</ul>
      <h2>Sessions</h2>
      <table>
        <thead><tr><th>Date</th><th>Type</th><th>Score</th><th>Faiblesses</th></tr></thead>
        <tbody>${sessions.map((session) => `<tr><td>${formatDate(session.createdAt)}</td><td>${session.drillName}</td><td>${session.score}</td><td>${session.weaknesses.join(", ")}</td></tr>`).join("")}</tbody>
      </table>
      <script>window.print()</script>
    </body>
  </html>`;
  downloadBlob(basketmotionFilename("report", "html"), new Blob([html], { type: "text/html;charset=utf-8" }));
}

export function exportExcelWorkbook({ sessions, recommendations = [] }: ExportBundle) {
  const sheets = {
    Players: [["Player", "Sessions"], ["Player", sessions.length]],
    Sessions: [["ID", "Date", "Type", "Score"], ...sessions.map((s) => [s.id, formatDate(s.createdAt), s.drillName, s.score])],
    Statistics: [["Metric", "Value"], ["Average Score", average(sessions.map((s) => s.score))], ["Videos", sessions.length]],
    Recommendations: [["Recommendation"], ...recommendations.map((item) => [item])],
  };

  const xml = `<?xml version="1.0"?>
  <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
    ${Object.entries(sheets).map(([name, rows]) => `
      <Worksheet ss:Name="${name}">
        <Table>${rows.map((row) => `<Row>${row.map((cell) => `<Cell><Data ss:Type="String">${escapeXml(String(cell))}</Data></Cell>`).join("")}</Row>`).join("")}</Table>
      </Worksheet>
    `).join("")}
  </Workbook>`;

  downloadBlob(basketmotionFilename("export", "xls"), new Blob([xml], { type: "application/vnd.ms-excel" }));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDate(value: unknown) {
  const date =
    value && typeof value === "object" && "toDate" in value
      ? (value as { toDate: () => Date }).toDate()
      : new Date(String(value || Date.now()));
  return date.toLocaleString();
}
