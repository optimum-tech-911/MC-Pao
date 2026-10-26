# Voices

The game has an original synthesized Riviera groove and event effects. Optional French browser narration is off by default and can be enabled in Pause VIP. It is labelled as narration and is not represented as MC Pao's voice.

To use supplied/approved recordings, place `.ogg`, `.mp3` or `.wav` clips here and map the exact callout text to the clip URL in `voice-manifest.json`, for example:

```json
{
  "La Richard Mille bleue mon gars !": "/assets/audio/richard-mille.ogg"
}
```

When narration is enabled, matching recordings play before any browser-narrator fallback. Lines have a five-second minimum interval, do not interrupt one another, and lower the music while playing. No real-person recordings or cloned voices are included.
