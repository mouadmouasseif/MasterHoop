import ffmpeg from "@ffmpeg-installer/ffmpeg";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const fixtureDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "videos");
mkdirSync(fixtureDirectory, { recursive: true });

const fixtures = [
  {
    name: "shot-complete-synthetic.webm",
    background: "0x59616b",
    baseFilter: [
      "drawgrid=width=40:height=40:thickness=1:color=white@0.08",
      "drawbox=x=145:y=65:w=30:h=75:color=0x3b82f6:t=fill",
    ].join(","),
    ballColor: "0xff6b00",
  },
  {
    name: "ball-absent-synthetic.webm",
    background: "0x59616b",
    baseFilter: [
      "drawgrid=width=40:height=40:thickness=1:color=white@0.08",
      "drawbox=x=145:y=65:w=30:h=75:color=0x3b82f6:t=fill",
    ].join(","),
  },
  {
    name: "low-light-synthetic.webm",
    background: "0x050506",
    baseFilter: [
      "drawbox=x=145:y=65:w=30:h=75:color=0x151a22:t=fill",
    ].join(","),
    ballColor: "0x3d1d08",
  },
  {
    name: "tracking-loss-synthetic.webm",
    background: "0x59616b",
    baseFilter: [
      "drawgrid=width=40:height=40:thickness=1:color=white@0.08",
      "drawbox=x=145:y=65:w=30:h=75:color=0x3b82f6:t=fill",
    ].join(","),
    ballColor: "0xff6b00",
    ballEnable: "lt(t,0.75)+gt(t,1.25)",
  },
];

for (const fixture of fixtures) {
  const output = resolve(fixtureDirectory, fixture.name);
  const args = [
    "-hide_banner",
    "-loglevel", "error",
    "-y",
    "-f", "lavfi",
    "-i", `color=c=${fixture.background}:s=320x180:r=10:d=2`,
  ];
  if (fixture.ballColor) {
    args.push(
      "-f", "lavfi",
      "-i", `color=c=${fixture.ballColor}:s=14x14:r=10:d=2`,
      "-filter_complex",
      `[0:v]${fixture.baseFilter}[court];[court][1:v]overlay=x='70+95*t':y='132-92*sin(PI*t/2)'${fixture.ballEnable ? `:enable='${fixture.ballEnable}'` : ""}:shortest=1[out]`,
      "-map", "[out]",
    );
  } else {
    args.push("-vf", fixture.baseFilter);
  }
  args.push(
    "-an",
    "-c:v", "libvpx",
    "-deadline", "realtime",
    "-cpu-used", "8",
    "-b:v", "180k",
    output,
  );
  const result = spawnSync(ffmpeg.path, args, { encoding: "utf8" });

  if (result.status !== 0) {
    throw new Error(`Échec de génération de ${fixture.name}: ${result.stderr || "erreur FFmpeg inconnue"}`);
  }
}

console.log(`${fixtures.length} fixtures vidéo synthétiques générées dans ${fixtureDirectory}`);
