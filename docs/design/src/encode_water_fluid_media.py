"""Encode browser media from the verified Mantaflow PNG windows.

The simulation remains the source of truth. These H.264/WebP files are only
fixed-camera delivery assets for ``browser-proofs.html``.

Run after ``water_fluid_sim.py --render-sequence`` has generated the three
sequence directories:

    python3 docs/design/src/encode_water_fluid_media.py
    python3 docs/design/src/encode_water_fluid_media.py low splash
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path


DESIGN_DIR = Path(__file__).resolve().parents[1]
RENDER_DIR = DESIGN_DIR / "renders" / "browser-proofs"


@dataclass(frozen=True)
class Clip:
    sequence_dir: str
    first_frame: int
    last_frame: int
    poster_frame: int

    @property
    def frame_count(self) -> int:
        return self.last_frame - self.first_frame + 1


CLIPS = {
    # Stop before the continuous low-flow solve begins closing into a dome.
    "low": Clip("water-fluid-low-flow-sequence", 7, 17, 17),
    # First interval with a connected jet and established basin motion.
    "impact": Clip("water-fluid-sequence", 14, 32, 28),
    # Off-axis pulse after impact: exposed sphere, torn sheet, crown and spray.
    "splash": Clip("water-fluid-splash-sequence", 10, 24, 20),
}


def command(*parts: object) -> list[str]:
    return [str(part) for part in parts]


def encode(name: str, clip: Clip, ffmpeg: str, ffprobe: str) -> dict[str, object]:
    sequence_dir = RENDER_DIR / clip.sequence_dir
    frame_pattern = sequence_dir / "frame_%04d.png"
    first_frame = sequence_dir / f"frame_{clip.first_frame:04d}.png"
    last_frame = sequence_dir / f"frame_{clip.last_frame:04d}.png"
    poster_frame = sequence_dir / f"frame_{clip.poster_frame:04d}.png"

    missing = [
        path for path in (first_frame, last_frame, poster_frame) if not path.exists()
    ]
    if missing:
        raise SystemExit(
            "Missing source frames for "
            f"{name}: {', '.join(str(path) for path in missing)}"
        )

    video = RENDER_DIR / f"water-fluid-{name}.mp4"
    poster = RENDER_DIR / f"water-fluid-{name}.webp"

    subprocess.run(
        command(
            ffmpeg,
            "-y",
            "-v",
            "error",
            "-framerate",
            24,
            "-start_number",
            clip.first_frame,
            "-i",
            frame_pattern,
            "-frames:v",
            clip.frame_count,
            "-an",
            "-c:v",
            "libx264",
            "-profile:v",
            "high",
            "-preset",
            "slow",
            "-crf",
            18,
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            "-fps_mode",
            "cfr",
            video,
        ),
        check=True,
    )
    subprocess.run(
        command(
            ffmpeg,
            "-y",
            "-v",
            "error",
            "-i",
            poster_frame,
            "-frames:v",
            1,
            "-c:v",
            "libwebp",
            "-quality",
            90,
            "-compression_level",
            6,
            poster,
        ),
        check=True,
    )

    probe = subprocess.run(
        command(
            ffprobe,
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=codec_name,profile,pix_fmt,width,height,r_frame_rate,nb_frames:"
            "format=duration,size",
            "-of",
            "json",
            video,
        ),
        check=True,
        capture_output=True,
        text=True,
    )
    subprocess.run(
        command(ffmpeg, "-v", "error", "-i", video, "-f", "null", "-"),
        check=True,
    )

    result = {
        "stage": name,
        **asdict(clip),
        "frame_count": clip.frame_count,
        "video": str(video),
        "poster": str(poster),
        "probe": json.loads(probe.stdout),
    }
    print(json.dumps(result, sort_keys=True))
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stages", nargs="*", metavar="STAGE")
    args = parser.parse_args()
    unknown = [stage for stage in args.stages if stage not in CLIPS]
    if unknown:
        parser.error(
            "unknown stage(s): "
            f"{', '.join(unknown)}; choose from {', '.join(CLIPS)}"
        )

    ffmpeg = shutil.which("ffmpeg")
    ffprobe = shutil.which("ffprobe")
    if not ffmpeg or not ffprobe:
        raise SystemExit("ffmpeg and ffprobe must both be available on PATH")

    stages = args.stages or list(CLIPS)
    for stage in stages:
        encode(stage, CLIPS[stage], ffmpeg, ffprobe)


if __name__ == "__main__":
    main()
