# Speech Service

**Status:** Not yet implemented

Transcribes voice input from the user into text for processing by the classifier service.

## Planned Behaviour

Accepts an audio file or stream and returns a text transcript:

```json
{ "transcript": "I've had a car accident near Koramangala" }
```

## Planned Implementation

- Whisper API or Google Speech-to-Text for transcription
- Support for Indian English and regional accents
- Streaming transcription for low-latency response
- Fallback: typed text input in the frontend bypasses this service entirely
