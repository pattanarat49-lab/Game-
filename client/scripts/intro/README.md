# Intro film (public/intro.mp4)

The user's Claude Design animation "Riftborn Intro" (an HTML/React composition, 60 s, English captions) rendered to video:

1. Unzip the Claude Design export and serve it: `python3 -m http.server 5300` in that folder.
2. `node capture.mjs 0 1800 frames` seeks the composition frame by frame (its `data-om-seek-to-time-frame` event, 30 fps) and screenshots the stage. Split the range over a few runs to go faster.
3. `python3 score.py score.wav` writes the suspense score, synthesised from scratch with numpy (no samples, so no licence questions), timed to the film's scenes: calm music box, error beeps, the glitch hand, the Rift Core shattering at 23.4 s, island hits, 132 BPM fight drums from 30 s with hits on every clash and montage cut, the logo slam at 54 s and 55.8 s.
4. `ffmpeg -framerate 30 -i frames/f%04d.png -i score.wav -map 0:v -map 1:a -vf scale=1280:720:flags=lanczos -c:v libx264 -preset slow -crf 24 -tune animation -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart -shortest intro.mp4`
