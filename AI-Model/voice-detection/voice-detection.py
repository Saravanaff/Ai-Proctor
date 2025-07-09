import sounddevice as sd
import numpy as np
from silero_vad import load_silero_vad, get_speech_timestamps

# Load Silero VAD model
model = load_silero_vad()

samplerate = 16000  # 16 kHz
block_duration = 1  # seconds

print("Listening for speech (press Ctrl+C to stop)...")
try:
    while True:
        # Record 1-second audio block
        audio = sd.rec(int(block_duration * samplerate), samplerate=samplerate, channels=1, dtype='float32')
        sd.wait()
        audio = audio.flatten()  

        # Normalize and apply soft gain safely
        if np.max(np.abs(audio)) > 0:
            audio = audio / np.max(np.abs(audio))     
            audio = audio * 100.0                     
            audio = np.clip(audio, -1.0, 1.0)          
        else:
            print("Silence block skipped.")
            continue

        # Run Silero VAD
        speech_timestamps = get_speech_timestamps(
            audio,
            model,
            sampling_rate=samplerate,
            return_seconds=True,
            threshold=0.6,                    # Higher = stricter
            min_speech_duration_ms=500,      # Ignore short blips
            min_silence_duration_ms=250,     # Require 250ms to end speech
            window_size_samples=512          # High resolution
        )

        # Print results
        if speech_timestamps:
            print("Speech detected at:")
            for ts in speech_timestamps:
                print(f"  Start: {ts['start']:.2f}s, End: {ts['end']:.2f}s")
        else:
            print("No speech detected in this block.")
except KeyboardInterrupt:
    print("Stopped.")
