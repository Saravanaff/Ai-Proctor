import numpy as np
import torch
import torchaudio
from silero_vad import load_silero_vad, get_speech_timestamps
from datetime import datetime

# Load Silero VAD model
model = load_silero_vad()

# Audio config for Silero
samplerate = 16000  # Silero expects 16kHz
block_duration = 1
CHUNK = int(samplerate * block_duration)

# Logging file
log_file = open("vad_log.txt", "a", encoding="utf-8")

# Function to resample audio from 48kHz (browser) to 16kHz (Silero VAD)
def resample_audio(audio_np: np.ndarray, orig_sr: int = 48000, target_sr: int = 16000):
    audio_tensor = torch.tensor(audio_np, dtype=torch.float32)
    resampler = torchaudio.transforms.Resample(orig_sr, target_sr)
    resampled_tensor = resampler(audio_tensor)
    return resampled_tensor.numpy()

# Socket.IO event handler setup
def setup_vad_handler(sio):
    @sio.on("process-audio")
    def process_audio(data):
        try:
            # Convert received bytes to NumPy array
            audio_bytes = data["buffer"]
            audio = np.frombuffer(audio_bytes, dtype=np.float32)

            # Normalize and apply gain
            if np.max(np.abs(audio)) > 0:
                audio = audio / np.max(np.abs(audio))
                audio = audio * 100.0
                audio = np.clip(audio, -1.0, 1.0)

                # 🔁 Resample from 48kHz to 16kHz
                audio = resample_audio(audio, orig_sr=48000, target_sr=16000)
            else:
                log_file.write(f"[{datetime.now()}]  🔇 Silence block skipped.\n")
                log_file.flush()
                return

            # Run Silero VAD
            speech_timestamps = get_speech_timestamps(
                audio,
                model,
                sampling_rate=samplerate,
                return_seconds=True,
                threshold=0.6,
                min_speech_duration_ms=500,
                min_silence_duration_ms=250,
                window_size_samples=512
            )

            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            if speech_timestamps:
                log_file.write(f"[{current_time}]  🗣️ Speech detected:\n")
                for ts in speech_timestamps:
                    log_file.write(f"   └── Start: {ts['start']:.2f}s, End: {ts['end']:.2f}s\n")
            else:
                log_file.write(f"[{current_time}]  ❌ No speech detected.\n")

            log_file.flush()

            # Emit result back to client
            sio.emit("vad-result", {
                "timestamp": current_time,
                "segments": speech_timestamps,
                "speech_detected": bool(speech_timestamps)
            })

        except Exception as e:
            log_file.write(f"[{datetime.now()}]  ❗ Error: {str(e)}\n")
            log_file.flush()
            sio.emit("vad-error", {"error": str(e)})
