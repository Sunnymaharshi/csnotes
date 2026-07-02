// Shared icon conventions so lucide usage stays consistent across the app.
// Sizes are a small scale instead of per-call-site magic numbers; strokeWidth
// gives icons a slightly bolder, more confident line than lucide's hairline default.
export const ICON = {
  sm: 18, // inline / dense (search, chips)
  md: 22, // default (nav, header, action bars)
  lg: 26, // emphasis
  brand: 52, // drawer logo
  empty: 64, // empty-state illustration
} as const;

export const ICON_STROKE = 2.25;
