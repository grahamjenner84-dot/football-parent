import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Simple static-slideshow assembly: each rendered PNG frame held for its own
// duration, concatenated into one MP4. Not per-frame animation - a real
// video file made of still images is enough to get Reel-tier reach, and it's
// far simpler/cheaper to render and debug than an animated pipeline.

export function checkFfmpegAvailable(): boolean {
  const result = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  return !result.error && result.status === 0;
}

export const FFMPEG_INSTALL_HINT =
  "ffmpeg was not found on PATH. Install it locally, e.g.:\n" +
  "  winget install --id Gyan.FFmpeg -e\n" +
  "  (or) choco install ffmpeg\n" +
  "  (or) scoop install ffmpeg\n" +
  "Then restart your terminal so PATH picks it up.";

export interface VideoFrame {
  pngBuffer: Buffer;
  durationSec: number;
}

export interface AssembleOptions {
  audioUrl?: string | null;
  fps?: number;
}

// frames -> MP4 buffer. If audioUrl is given, it's fetched and muxed in with
// -shortest, so the output is capped at whichever of (total slide durations,
// audio length) is shorter - a known Phase A limitation: a much-longer audio
// track will get cut off rather than looped, and a much-shorter one will cut
// the slideshow short. Fine for the static-slideshow-with-optional-backing-
// track case this is built for; revisit if that stops being true.
export async function assembleSlideshowMp4(frames: VideoFrame[], opts: AssembleOptions = {}): Promise<Buffer> {
  if (!frames.length) throw new Error("assembleSlideshowMp4: no frames given");
  if (!checkFfmpegAvailable()) throw new Error(FFMPEG_INSTALL_HINT);

  const fps = opts.fps ?? 30;
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "fp-reel-"));
  try {
    const listLines: string[] = [];
    let lastFramePath = "";
    frames.forEach((frame, i) => {
      const framePath = path.join(workDir, `frame-${String(i).padStart(3, "0")}.png`);
      fs.writeFileSync(framePath, frame.pngBuffer);
      const escaped = framePath.replace(/'/g, "'\\''");
      listLines.push(`file '${escaped}'`);
      listLines.push(`duration ${Math.max(0.1, frame.durationSec)}`);
      lastFramePath = escaped;
    });
    // The concat demuxer ignores the duration on the final entry unless that
    // file is listed once more with no duration line after it.
    listLines.push(`file '${lastFramePath}'`);
    const listPath = path.join(workDir, "frames.txt");
    fs.writeFileSync(listPath, listLines.join("\n"));

    let audioPath: string | null = null;
    if (opts.audioUrl) {
      const res = await fetch(opts.audioUrl);
      if (!res.ok) throw new Error(`Failed to fetch audio track: ${opts.audioUrl} (${res.status})`);
      const ext = /\.(mp3|m4a|aac|wav)(\?|$)/i.exec(opts.audioUrl)?.[1]?.toLowerCase() ?? "mp3";
      audioPath = path.join(workDir, `audio.${ext}`);
      fs.writeFileSync(audioPath, Buffer.from(await res.arrayBuffer()));
    }

    // The concat demuxer's "repeat the last file with no duration" trick
    // (needed so the true last frame's own `duration` line is honoured at
    // all) turns out to make that repeated terminator entry inherit the
    // previous line's `duration` as a sticky option rather than being
    // ignored - verified empirically: it silently appends one extra copy of
    // the last frame for its own duration. -t hard-caps the output at the
    // intended total regardless of that quirk, rather than depending on
    // getting the demuxer's terminator semantics exactly right.
    const totalDurationSec = frames.reduce((sum, f) => sum + Math.max(0.1, f.durationSec), 0);

    const outPath = path.join(workDir, "out.mp4");
    const args = ["-y", "-f", "concat", "-safe", "0", "-i", listPath];
    if (audioPath) args.push("-i", audioPath);
    args.push("-vf", `fps=${fps},format=yuv420p`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-t", String(totalDurationSec));
    if (audioPath) args.push("-c:a", "aac", "-shortest");
    args.push(outPath);

    const result = spawnSync("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    if (result.error) throw new Error(`ffmpeg failed to run: ${result.error.message}`);
    if (result.status !== 0) {
      const stderr = result.stderr?.toString().slice(-2000) ?? "";
      throw new Error(`ffmpeg exited with status ${result.status}: ${stderr}`);
    }

    return fs.readFileSync(outPath);
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}
