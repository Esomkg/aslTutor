FROM python:3.11-slim

# Install system libs needed by opencv-headless and mediapipe
# libgles2-mesa provides libGLESv2.so.2 (plain libgles2 does not on Debian slim)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgthread-2.0-0 \
    libegl1 \
    libgles2-mesa \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "start.py"]
