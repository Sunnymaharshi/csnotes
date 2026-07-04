# App logo

`gen_logo.py` generates all five app-icon assets in `assets/` from code:

- `icon.png` — main icon (moon + notes on near-black)
- `android-icon-foreground.png` / `android-icon-background.png` — adaptive icon layers
- `android-icon-monochrome.png` — flat white silhouette for Android 13+ themed icons
- `splash-icon.png`

## Design
A thin crescent moon tilted left, on a near-black background. Three note-lines emerge
from the moon's inner edge — they share the moon's exact fill colour, so where they overlap
the moon they disappear and only their tips show in the dark opening (the moon "writing" notes).

## Regenerate / tweak
```bash
pip install cairosvg          # once
brew install cairo            # macOS: native lib cairosvg needs

python3 scripts/logo/gen_logo.py           # from repo root
# if macOS can't find cairo:
DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib python3 scripts/logo/gen_logo.py
```

All tunable values (moon thickness, tilt, colours, note-line positions, per-asset scale)
are grouped at the top of `gen_logo.py` under **"TWEAK HERE"**. Common tweaks:

| Want | Change |
|------|--------|
| Thinner moon | move `C2` x closer to 512 and/or raise `R2` |
| More/less left tilt | make `TILT` more/less negative |
| Lines closer to moon | lower `LINES_X0` **and** each value in `RIGHT` by the same amount |
| Different moon tone | `MOON` (and `MONO` stays pure white for themed icons) |
| Lighter/darker bg | `BG_TOP` / `BG_BOTTOM` |

After regenerating, rebuild the app to see the launcher/splash icon
(`npx expo run:android` / prebuild) — a Metro reload will **not** update it.
The pre-Android-13 adaptive fallback colour also lives in `app.json`
(`android.adaptiveIcon.backgroundColor`, currently `#050506`).
