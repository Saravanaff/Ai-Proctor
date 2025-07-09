import socketio
import numpy as np
from silero_vad import load_silero_vad, get_speech_timestamps
from datetime import datetime
import time

# Load Silero VAD model
model = load_silero_vad()

# Audio config
samplerate = 16000
block_duration = 1
CHUNK = int(samplerate * block_duration)

# Setup log file
log_file = open("speech_log.txt", "a")

# Create Socket.IO client
sio = socketio.Client()

@sio.event
def connect():
    print("✅ Connected to frontend via Socket.IO")
    sio.emit("register-python-vad")

@sio.event
def disconnect():
    print("🔌 Disconnected from frontend")

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
        else:
            print(" Silence block skipped.")
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

        # Log and emit result
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        if speech_timestamps:
            print(" Speech detected:")
            for ts in speech_timestamps:
                log_line = f"{current_time} - Start: {ts['start']:.2f}s, End: {ts['end']:.2f}s\n"
                print(log_line.strip())
                log_file.write(log_line)
                log_file.flush()

            sio.emit("vad-result", {
                "timestamp": current_time,
                "segments": speech_timestamps,
                "speech_detected": True
            })
        else:
            print(" No speech detected.")
            sio.emit("vad-result", {
                "timestamp": current_time,
                "segments": [],
                "speech_detected": False
            })

    except Exception as e:
        print(" Error:", e)
        sio.emit("vad-error", {"error": str(e)})

# Connect to the frontend Socket.IO server
sio.connect("http://localhost:3001")
try:
    # Keep the process alive
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("Server stopped by user.")

finally:
    sio.disconnect()
    if not log_file.closed:
        log_file.close()
