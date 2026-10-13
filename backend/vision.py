import os
import uuid
import logging
import threading
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
from PIL import Image
import io

logger = logging.getLogger("campuslens.vision")

# Base directory for uploads
BACKEND_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = BACKEND_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Maximum image size (8 MB)
MAX_FILE_SIZE = 8 * 1024 * 1024

# Supported image MIME types
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

# Zero-shot classification candidates mapped to structured categories
CANDIDATE_MAP: Dict[str, str] = {
    "broken light or faulty electrical fixture or exposed wiring": "Electrical issue or broken light",
    "water leakage or dripping pipe or plumbing water puddle": "Water leakage or plumbing",
    "damaged wooden desk or broken chair or vandalized classroom furniture": "Damaged classroom furniture",
    "garbage litter plastic trash overflowing waste bin": "Garbage or litter",
    "cracked wall or damaged ceiling panel or broken door or shattered window": "Damaged wall, ceiling, door, or window",
    "broken ceiling fan or malfunctioning projector or damaged campus equipment": "Broken fan or campus equipment",
    "clean and undamaged campus room with no visible facility issue": "No obvious visible issue",
    "unclear or ambiguous scene requiring manual inspection": "Other or uncertain issue",
}

# State variables for lazy loading
_model_lock = threading.Lock()
_classifier = None
_model_status = "unloaded"  # unloaded | loading | ready | error
_model_error_message = ""
_mock_classifier_fn = None  # Hook for testing without model download

def set_mock_classifier(fn):
    """Set a mock classifier function for fast unit tests."""
    global _mock_classifier_fn
    _mock_classifier_fn = fn

def get_vision_status() -> Dict[str, Any]:
    """Returns the current loading and health status of the vision pipeline."""
    return {
        "status": _model_status,
        "model_name": "openai/clip-vit-base-patch32",
        "error_message": _model_error_message,
        "is_ready": _model_status == "ready" or _mock_classifier_fn is not None
    }

def load_vision_model():
    """Lazily load the Hugging Face zero-shot image classification pipeline."""
    global _classifier, _model_status, _model_error_message
    if _mock_classifier_fn is not None:
        return _mock_classifier_fn

    if _classifier is not None:
        return _classifier

    with _model_lock:
        if _classifier is not None:
            return _classifier

        _model_status = "loading"
        logger.info("Initializing Hugging Face zero-shot pipeline (openai/clip-vit-base-patch32)...")
        try:
            from transformers import pipeline
            # Load CLIP zero-shot classification pipeline
            _classifier = pipeline(
                "zero-shot-image-classification",
                model="openai/clip-vit-base-patch32",
                device=-1  # CPU for cross-platform portability
            )
            _model_status = "ready"
            _model_error_message = ""
            logger.info("Vision model loaded successfully.")
            return _classifier
        except Exception as e:
            _model_status = "error"
            _model_error_message = str(e)
            logger.error(f"Failed to load vision model: {e}")
            raise RuntimeError(
                f"Vision model 'openai/clip-vit-base-patch32' could not be loaded: {e}. "
                "Ensure internet access to Hugging Face or use manual issue reporting."
            )

def validate_and_save_image(file_bytes: bytes, filename: str, content_type: str) -> Tuple[str, Image.Image]:
    """
    Validates uploaded file size and content integrity, and saves to uploads directory.
    Returns relative image path and opened PIL Image.
    """
    if len(file_bytes) > MAX_FILE_SIZE:
        raise ValueError(f"Image file exceeds maximum allowable size of 8 MB (size: {len(file_bytes)/(1024*1024):.2f} MB).")

    if content_type not in ALLOWED_MIME_TYPES:
        raise ValueError(f"Unsupported image type '{content_type}'. Allowed formats are JPEG, PNG, and WebP.")

    try:
        image = Image.open(io.BytesIO(file_bytes))
        image.verify()  # Verifies image header and integrity
        # Re-open after verify because verify() consumes file pointer
        image = Image.open(io.BytesIO(file_bytes))
        # Ensure RGB format for model compatibility
        if image.mode != "RGB":
            image = image.convert("RGB")
    except Exception as e:
        raise ValueError(f"Uploaded file is corrupted or not a readable image: {e}")

    # Generate safe unique filename
    ext = Path(filename).suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        ext = ".jpg"
    safe_name = f"issue_{uuid.uuid4().hex[:12]}_{int(image.width)}x{int(image.height)}{ext}"
    saved_path = UPLOADS_DIR / safe_name
    
    # Save optimized copy locally
    image.save(saved_path, format="JPEG" if ext in [".jpg", ".jpeg"] else "PNG", quality=90)
    
    relative_path = f"/uploads/{safe_name}"
    return relative_path, image

def classify_campus_image(image: Image.Image) -> Dict[str, Any]:
    """
    Runs zero-shot image classification across standard campus issue categories.
    Returns structured suggestion with top alternatives and confirmation requirement.
    """
    global _mock_classifier_fn
    if _mock_classifier_fn is not None:
        return _mock_classifier_fn(image)

    classifier = load_vision_model()
    candidate_labels = list(CANDIDATE_MAP.keys())

    # Execute zero-shot classification
    results = classifier(image, candidate_labels=candidate_labels)
    # Results format: [{'score': 0.82, 'label': '...'}, {'score': 0.10, 'label': '...'}, ...]

    top_alternatives = []
    seen_categories = set()

    for item in results:
        raw_label = item["label"]
        category = CANDIDATE_MAP.get(raw_label, "Other or uncertain issue")
        score = round(float(item["score"]), 3)
        if category not in seen_categories:
            seen_categories.add(category)
            top_alternatives.append({
                "category": category,
                "score": score,
                "description": f"AI visual relevance score: {score:.3f}"
            })

    if not top_alternatives:
        return {
            "suggested_category": "Other or uncertain issue",
            "top_alternatives": [],
            "message": "AI analysis was inconclusive. Please select an issue category manually.",
            "needs_confirmation": True,
            "model_name": "openai/clip-vit-base-patch32",
            "model_status": _model_status
        }

    top_pick = top_alternatives[0]
    suggested_category = top_pick["category"]
    top_score = top_pick["score"]

    # Needs confirmation if top score is below 0.40 or close to runner-up
    needs_confirmation = True
    if len(top_alternatives) > 1:
        margin = top_score - top_alternatives[1]["score"]
        if top_score >= 0.55 and margin >= 0.20:
            needs_confirmation = False

    if suggested_category == "No obvious visible issue":
        message = (
            f"The model detected no obvious defect (score: {top_score:.2f}). "
            "If an issue exists, please choose a specific category manually."
        )
        needs_confirmation = True
    elif needs_confirmation:
        message = (
            f"AI suggested '{suggested_category}' (score: {top_score:.2f}), "
            "but multiple categories are possible. Please verify or adjust the selection."
        )
    else:
        message = (
            f"AI strongly suggests '{suggested_category}' (score: {top_score:.2f}). "
            "Please confirm this matches the real-world condition."
        )

    return {
        "suggested_category": suggested_category,
        "top_alternatives": top_alternatives[:4],
        "message": message,
        "needs_confirmation": needs_confirmation,
        "model_name": "openai/clip-vit-base-patch32",
        "model_status": _model_status
    }
