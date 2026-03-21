# ASL Classifier — Letters + Numbers
# Run this on Kaggle as a Python script notebook
#
# Datasets needed (+ Add Data):
#   1. asl-fingerspelling  (Google competition)
#   2. lexset/synthetic-asl-numbers
#
# Output: /kaggle/working/asl_classifier.pkl

# ── Installs ─────────────────────────────────────────────────────────────────
import subprocess
subprocess.run(["pip", "install", "mediapipe", "pyarrow", "--quiet"], check=True)

# ── Imports ───────────────────────────────────────────────────────────────────
import os, pickle, urllib.request
from pathlib import Path
import numpy as np
import pandas as pd
import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

print("Imports OK")

# ── MediaPipe hand landmarker ─────────────────────────────────────────────────
HAND_MODEL_PATH = Path("/kaggle/working/hand_landmarker.task")
HAND_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
)
if not HAND_MODEL_PATH.exists():
    print("Downloading hand landmarker model...")
    urllib.request.urlretrieve(HAND_MODEL_URL, HAND_MODEL_PATH)
    print("Done.")

base_options = mp_python.BaseOptions(model_asset_path=str(HAND_MODEL_PATH))
options = mp_vision.HandLandmarkerOptions(
    base_options=base_options,
    num_hands=1,
    min_hand_detection_confidence=0.3,
    min_hand_presence_confidence=0.3,
    min_tracking_confidence=0.3,
)
landmarker = mp_vision.HandLandmarker.create_from_options(options)
print("HandLandmarker ready.")


def extract_landmarks_from_image(img_path) -> np.ndarray | None:
    """Run MediaPipe on an image file, return 63-dim wrist-normalized vector."""
    bgr = cv2.imread(str(img_path))
    if bgr is None:
        return None
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = landmarker.detect(mp_image)
    if not result.hand_landmarks:
        return None
    lm = result.hand_landmarks[0]
    wrist = lm[0]
    coords = []
    for point in lm:
        coords.extend([point.x - wrist.x, point.y - wrist.y, point.z - wrist.z])
    return np.array(coords, dtype=np.float32)


# ═══════════════════════════════════════════════════════════════════════════════
# PART 1 — Letters from Google ASL Fingerspelling (parquet landmarks)
# ═══════════════════════════════════════════════════════════════════════════════
print("\n── Part 1: Letters ──────────────────────────────────────────────────────")

FINGERSPELL_ROOT = Path("/kaggle/input/asl-fingerspelling")
train_csv = FINGERSPELL_ROOT / "train.csv"
landmark_dir = FINGERSPELL_ROOT / "train_landmark_files"

if not train_csv.exists():
    print("Contents of /kaggle/input:")
    for p in sorted(Path("/kaggle/input").iterdir()):
        print(" ", p)
    raise FileNotFoundError(
        "Add the asl-fingerspelling dataset via + Add Data → search 'asl-fingerspelling'"
    )

df_train = pd.read_csv(train_csv)
print(f"train.csv: {len(df_train)} rows")

SKIP_LETTERS = {"j", "J", "z", "Z"}   # motion-based, skip
MAX_PER_LETTER = 800

# Column naming varies between dataset versions — try both
HAND_X = [f"x_right_hand_{i}" for i in range(21)]
HAND_Y = [f"y_right_hand_{i}" for i in range(21)]
HAND_Z = [f"z_right_hand_{i}" for i in range(21)]
ALT_X  = [f"x_hand_{i}" for i in range(21)]
ALT_Y  = [f"y_hand_{i}" for i in range(21)]
ALT_Z  = [f"z_hand_{i}" for i in range(21)]

letter_samples: dict[str, list] = {}
parquet_files = sorted(landmark_dir.rglob("*.parquet"))
print(f"Found {len(parquet_files)} parquet files — processing up to 500...")

for pf in parquet_files[:500]:
    try:
        seq_id = int(pf.stem)
    except ValueError:
        continue

    row = df_train[df_train["sequence_id"] == seq_id]
    if row.empty:
        continue
    phrase = str(row.iloc[0]["phrase"])

    try:
        lm_df = pd.read_parquet(pf)
    except Exception:
        continue

    # Pick column set
    if HAND_X[0] in lm_df.columns:
        xcols, ycols, zcols = HAND_X, HAND_Y, HAND_Z
    elif ALT_X[0] in lm_df.columns:
        xcols, ycols, zcols = ALT_X, ALT_Y, ALT_Z
    else:
        continue

    frames = sorted(lm_df["frame"].unique() if "frame" in lm_df.columns else lm_df.index.unique())
    n_frames = len(frames)
    n_letters = len(phrase)
    if n_letters == 0 or n_frames == 0:
        continue

    for li, ch in enumerate(phrase):
        ch_up = ch.upper()
        if ch_up in SKIP_LETTERS or not ch.isalpha():
            continue
        if len(letter_samples.get(ch_up, [])) >= MAX_PER_LETTER:
            continue

        fi = min(int(li / n_letters * n_frames), n_frames - 1)
        target_frame = frames[fi]
        frow = lm_df[lm_df["frame"] == target_frame] if "frame" in lm_df.columns else lm_df.loc[[target_frame]]
        if frow.empty:
            continue

        try:
            xs = frow[xcols].values[0].astype(np.float32)
            ys = frow[ycols].values[0].astype(np.float32)
            zs = frow[zcols].values[0].astype(np.float32)
        except Exception:
            continue

        if np.isnan(xs).any() or np.isnan(ys).any():
            continue

        xs -= xs[0]; ys -= ys[0]; zs -= zs[0]
        feat = np.concatenate([xs, ys, zs])  # 63-dim

        letter_samples.setdefault(ch_up, []).append(feat)

for ch, s in sorted(letter_samples.items()):
    print(f"  {ch}: {len(s)}")
print(f"Letter classes: {len(letter_samples)}")


# ═══════════════════════════════════════════════════════════════════════════════
# PART 2 — Numbers 0-9 from synthetic-asl-numbers (images → MediaPipe)
# ═══════════════════════════════════════════════════════════════════════════════
print("\n── Part 2: Numbers ──────────────────────────────────────────────────────")

NUMBERS_ROOT = None
for candidate in [
    "/kaggle/input/synthetic-asl-numbers",
    "/kaggle/input/synthetic-asl-numbers/synthetic-asl-numbers",
]:
    p = Path(candidate)
    if p.exists():
        subdirs = [x.name for x in p.iterdir() if x.is_dir()]
        if any(s.isdigit() for s in subdirs) or "zero" in subdirs:
            NUMBERS_ROOT = p
            break

if NUMBERS_ROOT is None:
    print("Contents of /kaggle/input:")
    for p in sorted(Path("/kaggle/input").iterdir()):
        print(" ", p)
    raise FileNotFoundError(
        "Add the numbers dataset via + Add Data → search 'synthetic-asl-numbers'"
    )

print(f"Numbers dataset: {NUMBERS_ROOT}")

DIGIT_WORDS = {"0":"zero","1":"one","2":"two","3":"three","4":"four",
               "5":"five","6":"six","7":"seven","8":"eight","9":"nine"}
MAX_PER_DIGIT = 500

number_samples: dict[str, list] = {}
skipped = 0

for digit in "0123456789":
    digit_dir = NUMBERS_ROOT / digit
    if not digit_dir.exists():
        digit_dir = NUMBERS_ROOT / DIGIT_WORDS[digit]
    if not digit_dir.exists():
        matches = [d for d in NUMBERS_ROOT.iterdir()
                   if d.is_dir() and d.name.lower() in (digit, DIGIT_WORDS[digit])]
        digit_dir = matches[0] if matches else None

    if digit_dir is None or not digit_dir.exists():
        print(f"  WARNING: no folder for digit {digit}")
        continue

    images = (list(digit_dir.glob("*.jpg")) +
              list(digit_dir.glob("*.png")) +
              list(digit_dir.glob("*.jpeg")))[:MAX_PER_DIGIT]

    count = 0
    for img_path in images:
        feat = extract_landmarks_from_image(img_path)
        if feat is not None:
            number_samples.setdefault(digit, []).append(feat)
            count += 1
        else:
            skipped += 1

    print(f"  {digit}: {count}")

print(f"Skipped (no hand): {skipped}")
print(f"Digit classes: {len(number_samples)}")


# ═══════════════════════════════════════════════════════════════════════════════
# PART 3 — Combine, Train, Evaluate, Save
# ═══════════════════════════════════════════════════════════════════════════════
print("\n── Part 3: Train ────────────────────────────────────────────────────────")

X_all, y_all = [], []
for label, samples in letter_samples.items():
    X_all.extend(samples)
    y_all.extend([label] * len(samples))
for label, samples in number_samples.items():
    X_all.extend(samples)
    y_all.extend([label] * len(samples))

X_all = np.array(X_all, dtype=np.float32)
y_all = np.array(y_all)
print(f"Total samples: {len(X_all)}, classes: {sorted(set(y_all))}")

X_train, X_test, y_train, y_test = train_test_split(
    X_all, y_all, test_size=0.2, random_state=42, stratify=y_all
)
print(f"Train: {len(X_train)}, Test: {len(X_test)}")

print("Training Random Forest...")
clf = RandomForestClassifier(
    n_estimators=300, max_depth=25, min_samples_leaf=2,
    random_state=42, n_jobs=-1,
)
clf.fit(X_train, y_train)
print("Done.")

y_pred = clf.predict(X_test)
print(f"\nTest accuracy: {accuracy_score(y_test, y_pred):.1%}\n")
print(classification_report(y_test, y_pred))

MODEL_OUT = Path("/kaggle/working/asl_classifier.pkl")
with open(MODEL_OUT, "wb") as f:
    pickle.dump(clf, f)
print(f"\nSaved: {MODEL_OUT}  ({MODEL_OUT.stat().st_size / 1024 / 1024:.1f} MB)")
print("Classes:", sorted(clf.classes_))
print("\nNEXT STEPS:")
print("1. Download asl_classifier.pkl from the Output panel")
print("2. Replace backend/asl_classifier.pkl")
print("3. Restart the backend")
