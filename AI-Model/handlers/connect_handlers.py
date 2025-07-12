def register_events(sio):
    @sio.event
    def connect():
        print("✅ Connected to Node.js socket server")
        sio.emit("register-python")

    @sio.event
    def disconnect():
        print("🔌 Disconnected from server")