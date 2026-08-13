export type SizePreset = {
  label: string;
  value: string;
  width: number;
  height: number;
};

export const CUSTOM_SIZE_VALUE = "custom";

export const sizePresets: SizePreset[] = [
  // Common Video Formats
  { label: "Full HD (1080p)", value: "full-hd-1080p", width: 1920, height: 1080 },
  { label: "HD (720p)", value: "hd-720p", width: 1280, height: 720 },
  { label: "Quad HD (1440p)", value: "qhd-1440p", width: 2560, height: 1440 },
  { label: "4K UHD (2160p)", value: "uhd-4k-2160p", width: 3840, height: 2160 },
  { label: "Vertical Video (9:16)", value: "vertical-1080x1920", width: 1080, height: 1920 },
  { label: "Square Video (1:1)", value: "square-1080x1080", width: 1080, height: 1080 },
  { label: "CinemaScope (2.39:1)", value: "cinemascope-1920x803", width: 1920, height: 803 },
  { label: "Instagram Post", value: "ig-post", width: 1080, height: 1080 },
  { label: "Instagram Portrait", value: "ig-portrait", width: 1080, height: 1350 },
  { label: "Instagram Story / Reels", value: "ig-story", width: 1080, height: 1920 },
  { label: "Facebook Post", value: "fb-post", width: 1200, height: 630 },
  { label: "Facebook Cover", value: "fb-cover", width: 820, height: 312 },
  { label: "X / Twitter Post", value: "x-post", width: 1600, height: 900 },
  { label: "X / Twitter Header", value: "x-header", width: 1500, height: 500 },
  { label: "LinkedIn Post", value: "li-post", width: 1200, height: 627 },
  { label: "LinkedIn Cover", value: "li-cover", width: 1584, height: 396 },
  { label: "YouTube Thumbnail", value: "yt-thumb", width: 1280, height: 720 },
  { label: "Pinterest Pin", value: "pin", width: 1000, height: 1500 },
  { label: "TikTok", value: "tiktok", width: 1080, height: 1920 },

  { label: "Custom size", value: CUSTOM_SIZE_VALUE, width: 1600, height: 1200 },
];

export const defaultSizePreset: SizePreset = sizePresets[0];
