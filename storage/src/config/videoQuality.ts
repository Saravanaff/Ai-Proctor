export interface VideoQualityPreset {
  name: string;
  crf: number;
  preset: string;
  resolution?: string;
  description: string;
}

export const VIDEO_QUALITY_PRESETS: { [key: string]: VideoQualityPreset } = {
  low: {
    name: "Low Quality",
    crf: 28,
    preset: "ultrafast",
    resolution: "640x480",
    description: "Fast encoding, small file size, lower quality",
  },
  medium: {
    name: "Medium Quality",
    crf: 23,
    preset: "fast",
    resolution: "1280x720",
    description: "Balanced encoding speed and quality",
  },
  high: {
    name: "High Quality",
    crf: 18,
    preset: "medium",
    description: "Better quality, larger file size, slower encoding",
  },
  ultra: {
    name: "Ultra Quality",
    crf: 15,
    preset: "slow",
    description: "Highest quality, largest file size, slowest encoding",
  },
};

export function getVideoQualityPreset(
  quality: keyof typeof VIDEO_QUALITY_PRESETS = "high"
): VideoQualityPreset {
  return VIDEO_QUALITY_PRESETS[quality] ?? VIDEO_QUALITY_PRESETS.high!;
}
