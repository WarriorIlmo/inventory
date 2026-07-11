DPS-INVENTORY — Local Fonts
============================

This project loads all fonts locally (css/fonts.css) so the app works
with zero internet connectivity, as required. Binary font files can't be
generated here, so add these free, open-license files to this folder
before your first build:

  Poppins-SemiBold.woff2   (Poppins, weight 600)
  Poppins-Bold.woff2       (Poppins, weight 700)
  Poppins-ExtraBold.woff2  (Poppins, weight 800)
  Inter-Regular.woff2      (Inter, weight 400)
  Inter-Medium.woff2       (Inter, weight 500)
  Inter-SemiBold.woff2     (Inter, weight 600)
  Inter-Bold.woff2         (Inter, weight 700)
  RobotoMono-Medium.woff2  (Roboto Mono, weight 500)
  RobotoMono-Bold.woff2    (Roboto Mono, weight 700)
  MaterialIcons-Regular.woff2

Where to get them (download once, on any internet-connected machine,
then copy into this folder — the app itself never fetches them at
runtime):
  - Poppins / Inter / Roboto Mono: Google Fonts (fonts.google.com),
    convert the downloaded .ttf to .woff2 with any local converter,
    or use the "google-webfonts-helper" tool to get woff2 directly.
  - Material Icons: fonts.google.com/icons -> "Material Icons" ->
    download the static font, convert to woff2 if needed.

If you skip this step the app still runs: text falls back to the
device's system font, and Material Icons ligatures fall back to
plain text labels (e.g. "search" instead of a magnifying glass icon).
