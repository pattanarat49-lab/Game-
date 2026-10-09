# Intro film (public/intro.mp4)

The user's animation (Riftborn Intro.mp4, 1280x720, 60 s, Thai subtitles, no sound) rebuilt with:

1. `python3 subs.py original.mp4 subs.mp4` covers each Thai subtitle box with an English one (same bracket style, typed in) and swaps the closing tagline under the logo.
2. `python3 score.py score.wav` writes the suspense score, synthesised from scratch with numpy (no samples, so no licence questions), timed to the film's cuts: calm music box, glitch beeps and drone, the crystal shattering at 23.4 s, 132 BPM fight drums from 30 s, the title hit at 54 s.
3. `ffmpeg -i subs.mp4 -i score.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 26 -tune animation -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart -shortest intro.mp4`
