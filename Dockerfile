FROM python:3.11-slim

# Install system libs needed by opencv-headless and mediapipe
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgthread-2.0-0 \
    libegl1 \
    libgles2 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# mediapipe dlopen()s libGLESv2.so.2 -- create symlink if missing
RUN GLES=$(find /usr/lib -name "libGLESv2.so*" | head -1) && \
    if [ -n "$GLES" ] && [ ! -f /usr/lib/x86_64-linux-gnu/libGLESv2.so.2 ]; then \
        ln -sf "$GLES" /usr/lib/x86_64-linux-gnu/libGLESv2.so.2; \
    fi && \
    ldconfig

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Download the large classifier model from Hugging Face
RUN curl -L "https://huggingface.co/Esomkg/ASLLetterAndNumberClassifier/resolve/main/asl_classifier(1).pkl" \
    -o "backend/asl_classifier(1).pkl"

CMD ["python", "start.py"]