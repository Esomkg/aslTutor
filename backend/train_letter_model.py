"""
One-time training script for ASL fingerspelling letter classifier.

Downloads the ASL Alphabet dataset from Roboflow (free, no login required),
extracts MediaPipe hand landmarks from each image, trains a Random Forest,
and saves the model to backend/asl_classifier.pkl.

Run from the project root:
    python backend/train_letter_model.py

Requirements (already in requirements.txt):
    mediapipe>=0.10.30, opencv-python-headless, scikit-learn, numpy<2
"""

import os
import sys
import pickle
import zipfile
import urllib.request
from pathlib import Path

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

# Roboflow public ASL alphabet dataset (no login, direct download)
DATASET_URL = "https://public.roboflow.com/ds/xNBJFHMnJe?key=aJjRMnJFHM"

# Fallback: use the Kaggle ASL dataset if you have it locally
# Set this to the path of your asl_alphabet_train folder if available
LOCAL_DATASET_PATH = Path("data/asl_alphabet_train")

MODEL_OUT = Path("backend/asl_classifier.pkl")
HAND_MODEL_PATH = Path("backend/hand_landmarker.task")
HAND_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
)

LETTERS = list("ABCDEFGHIKLMNOPQRSTUVWXY")  # J and Z excluded (motion-based)
MAX_IMAGES_PER_CLASS = 300  # cap to keep training fast

# ---------------------------------------------------------------------------
# Download hand landmarker model
# ---------------------------------------------------------------------------

def ensure_hand_model():
    if HAND_MODEL_PATH.exists():
        return
    print(f"Downloading hand landmarker model...")
    urllib.request.urlretrieve(HAND_MODEL_URL, HAND_MODEL_PATH)
    print("Done.")

# ---------------------------------------------------------------------------
# Landmark extractor
# ---------------------------------------------------------------------------

def make_landmarker():
    base_options = mp_python.BaseOptions(model_asset_path=str(HAND_MODEL_PATH))
    options = mp_vision.HandLandmarkerOptions(
        base_options=base_options,
        num_hands=1,
        min_hand_detection_confidence=0.3,
        min_hand_presence_confidence=0.3,
        min_tracking_confidence=0.3,
    )
    return mp_vision.HandLandmarker.create_from_options(options)


def extract_landmarks(landmarker, img_path: Path):
    """Returns a flat numpy array of 63 values (21 landmarks x xyz), or None."""
    bgr = cv2.imread(str(img_path))
    if bgr is None:
        return None
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = landmarker.detect(mp_image)
    if not result.hand_landmarks:
        return None
    lm = result.hand_landmarks[0]
    # Normalize relative to wrist
    wrist = lm[0]
    coords = []
    for point in lm:
        coords.extend([point.x - wrist.x, point.y - wrist.y, point.z - wrist.z])
    return np.array(coords, dtype=np.float32)

# ---------------------------------------------------------------------------
# Build dataset from local folder
# ---------------------------------------------------------------------------

def build_dataset_from_folder(folder: Path, landmarker):
    X, y = [], []
    for letter in LETTERS:
        letter_dir = folder / letter
        if not letter_dir.exists():
            print(f"  Warning: missing folder for {letter}")
            continue
        images = list(letter_dir.glob("*.jpg")) + list(letter_dir.glob("*.png"))
        images = images[:MAX_IMAGES_PER_CLASS]
        print(f"  {letter}: processing {len(images)} images...")
        for img_path in images:
            feats = extract_landmarks(landmarker, img_path)
            if feats is not None:
                X.append(feats)
                y.append(letter)
    return np.array(X), np.array(y)

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    ensure_hand_model()

    if not LOCAL_DATASET_PATH.exists():
        print(f"ERROR: Dataset not found at {LOCAL_DATASET_PATH}")
        print()
        print("Please download the ASL Alphabet dataset from Kaggle:")
        print("  https://www.kaggle.com/datasets/grassknoted/asl-alphabet")
        print()
        print("Then extract it so the folder structure is:")
        print("  data/asl_alphabet_train/A/  (contains .jpg images)")
        print("  data/asl_alphabet_train/B/")
        print("  ...")
        print()
        print("Then re-run this script.")
        sys.exit(1)

    print("Building dataset from", LOCAL_DATASET_PATH)
    landmarker = make_landmarker()
    X, y = build_dataset_from_folder(LOCAL_DATASET_PATH, landmarker)
    landmarker.close()

    if len(X) == 0:
        print("ERROR: No landmarks extracted. Check your dataset path and images.")
        sys.exit(1)

    print(f"\nExtracted {len(X)} samples across {len(set(y))} classes.")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    print("Training Random Forest...")
    clf = RandomForestClassifier(n_estimators=200, max_depth=20, random_state=42, n_jobs=-1)
    clf.fit(X_train, y_train)

    acc = accuracy_score(y_test, clf.predict(X_test))
    print(f"Test accuracy: {acc:.1%}")

    MODEL_OUT.parent.mkdir(exist_ok=True)
    with open(MODEL_OUT, "wb") as f:
        pickle.dump(clf, f)
    print(f"Model saved to {MODEL_OUT}")


if __name__ == "__main__":
    main()