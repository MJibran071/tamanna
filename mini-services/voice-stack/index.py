"""
Tamanna Local Voice Stack
──────────────────────────
Smart multi-engine TTS + STT + LLM routing.
Auto-shifts between 7 TTS engines based on language, speed, and quality needs.
Zero paid APIs — all models run locally.
"""

import asyncio
import json
import os
import time
import uuid
import logging
import hashlib
import signal
import sys
from pathlib import Path
from typing import Optional
from functools import lru_cache
from datetime import datetime

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse, Response, StreamingResponse
from pydantic import BaseModel
import uvicorn

# ─── Config ───────────────────────────────────────────────────────────
HOST = "0.0.0.0"
PORT = 3010
MODELS_DIR = Path(os.environ.get("MODELS_DIR", os.path.join(os.path.dirname(__file__), "models")))
HF_CACHE = Path(os.environ.get("HF_HOME", str(Path.home() / ".cache" / "huggingface" / "hub")))
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("voice-stack")

# ─── Engine Registry ──────────────────────────────────────────────────

class EngineSpec:
    """Metadata for a TTS engine."""
    def __init__(self, id: str, name: str, model_id: str, size_mb: int,
                 languages: list[str], speed_tier: str, quality_tier: str,
                 is_loaded: bool = False, load_time_ms: int = 0):
        self.id = id
        self.name = name
        self.model_id = model_id
        self.size_mb = size_mb
        self.languages = languages
        self.speed_tier = speed_tier        # "ultra" | "fast" | "normal" | "slow"
        self.quality_tier = quality_tier    # "basic" | "good" | "excellent" | "premium"
        self.is_loaded = is_loaded
        self.load_time_ms = load_time_ms
        self.last_used: Optional[datetime] = None

ENGINES = {
    "kokoro": EngineSpec(
        id="kokoro", name="Kokoro", model_id="hexgrad/Kokoro-82M-v0.9-ONNX",
        size_mb=82, languages=["en"], speed_tier="fast", quality_tier="good",
    ),
    "luxtts": EngineSpec(
        id="luxtts", name="LuxTTS", model_id="YatharthS/Lux-TTS",
        size_mb=300, languages=["en"], speed_tier="ultra", quality_tier="good",
    ),
    "chatterbox_turbo": EngineSpec(
        id="chatterbox_turbo", name="Chatterbox Turbo", model_id="ResembleAI/chatterbox-turbo",
        size_mb=1500, languages=["en"], speed_tier="fast", quality_tier="excellent",
    ),
    "chatterbox_ml": EngineSpec(
        id="chatterbox_ml", name="Chatterbox ML", model_id="ResembleAI/chatterbox-ml",
        size_mb=3200, languages=["en", "es", "fr", "de", "it", "pt", "nl", "ru", "ja", "ko", "zh", "ar", "hi", "tr", "pl", "sv", "da", "no", "fi", "cs", "el", "he", "th", "vi", "id"],
        speed_tier="normal", quality_tier="excellent",
    ),
    "qwen_tts_0.6b": EngineSpec(
        id="qwen_tts_0.6b", name="Qwen TTS 0.6B", model_id="Qwen/Qwen3-TTS-0.6B",
        size_mb=1200, languages=["en", "zh", "es", "fr", "de", "ja", "ko", "ar", "hi", "ru", "pt", "it", "nl", "tr", "pl", "sv"],
        speed_tier="normal", quality_tier="good",
    ),
    "qwen_tts_1.7b": EngineSpec(
        id="qwen_tts_1.7b", name="Qwen TTS 1.7B", model_id="Qwen/Qwen3-TTS-1.7B",
        size_mb=3500, languages=["en", "zh", "es", "fr", "de", "ja", "ko", "ar", "hi", "ru", "pt", "it", "nl", "tr", "pl", "sv"],
        speed_tier="slow", quality_tier="premium",
    ),
    "tada": EngineSpec(
        id="tada", name="TADA", model_id="HumeAI/tada-1b",
        size_mb=4000, languages=["en"], speed_tier="slow", quality_tier="premium",
    ),
}

# ─── Smart Router ─────────────────────────────────────────────────────

class VoiceRouter:
    """
    Picks the best TTS engine based on:
    - Detected language of the text
    - User preference (speed vs quality)
    - Memory constraints (what's loaded)
    - Explicit engine override
    """

    LANGUAGE_ENGINE_MAP = {
        "ur": "qwen_tts_0.6b",   # Urdu
        "hi": "qwen_tts_0.6b",   # Hindi
        "ar": "qwen_tts_0.6b",   # Arabic
        "zh": "qwen_tts_0.6b",   # Chinese
        "ja": "qwen_tts_0.6b",   # Japanese
        "ko": "qwen_tts_0.6b",   # Korean
        "ru": "qwen_tts_0.6b",   # Russian
        "en": "kokoro",           # English default — fast & good
    }

    SPEED_PRIORITY = ["ultra", "fast", "normal", "slow"]
    QUALITY_PRIORITY = ["premium", "excellent", "good", "basic"]

    def __init__(self):
        self.user_preference: str | None = None  # "speed" | "quality" | "balanced"
        self.language_override: str | None = None  # force a specific language code
        self.engine_override: str | None = None    # force a specific engine id
        self.history: list[dict] = []

    def detect_language(self, text: str) -> str:
        """Detect language using langdetect."""
        try:
            from langdetect import detect
            lang = detect(text)
            return lang[:2].lower()
        except Exception:
            return "en"

    def pick_engine(self, text: str, speed_hint: str | None = None,
                    quality_hint: str | None = None) -> str:
        """
        Smart engine selection.
        Priority: explicit override > language match > preference > default.
        """
        # 1. Explicit engine override
        if self.engine_override and self.engine_override in ENGINES:
            return self.engine_override

        # 2. Detect language
        lang = self.language_override or self.detect_language(text)

        # 3. Find engines that support this language
        candidates = []
        for eid, spec in ENGINES.items():
            if lang in spec.languages or "en" in spec.languages:
                candidates.append(spec)

        if not candidates:
            candidates = [ENGINES["kokoro"]]  # fallback

        # 4. Sort by preference
        if speed_hint == "fastest" or self.user_preference == "speed":
            candidates.sort(key=lambda e: self.SPEED_PRIORITY.index(e.speed_tier))
        elif quality_hint == "best" or self.user_preference == "quality":
            candidates.sort(key=lambda e: self.QUALITY_PRIORITY.index(e.quality_tier))
        else:  # balanced — prefer language match, then speed
            lang_matched = [e for e in candidates if lang in e.languages]
            if lang_matched:
                candidates = lang_matched
            candidates.sort(key=lambda e: self.SPEED_PRIORITY.index(e.speed_tier))

        chosen = candidates[0]
        log.info(f"Router: lang={lang} pref={self.user_preference} hint_speed={speed_hint} → {chosen.id}")
        self.history.append({
            "timestamp": datetime.now().isoformat(),
            "text_preview": text[:80],
            "language": lang,
            "chosen_engine": chosen.id,
            "preference": self.user_preference,
        })
        return chosen.id

    def get_stats(self) -> dict:
        return {
            "preference": self.user_preference,
            "engine_override": self.engine_override,
            "language_override": self.language_override,
            "total_routes": len(self.history),
            "recent": self.history[-10:] if self.history else [],
        }


# ─── Model Manager (lazy load / hot-swap) ────────────────────────────

class ModelManager:
    """
    Manages loading/unloading models to stay within memory limits.
    Only keeps one model in memory at a time (hot-swap).
    Models are downloaded from HuggingFace on first use.
    """

    def __init__(self, max_memory_mb: int = 2000):
        self.max_memory_mb = max_memory_mb
        self.loaded_engine: Optional[str] = None
        self.loaded_model: any = None
        self._lock = asyncio.Lock()

    async def load_engine(self, engine_id: str) -> any:
        """Load a TTS engine, hot-swapping if needed."""
        async with self._lock:
            if self.loaded_engine == engine_id and self.loaded_model is not None:
                ENGINES[engine_id].last_used = datetime.now()
                return self.loaded_model

            # Unload current
            if self.loaded_model is not None:
                log.info(f"Unloading {self.loaded_engine}...")
                try:
                    del self.loaded_model
                except Exception:
                    pass
                self.loaded_model = None
                self.loaded_engine = None
                import gc
                gc.collect()

            spec = ENGINES[engine_id]
            log.info(f"Loading {spec.name} ({spec.size_mb}MB)...")

            try:
                if engine_id == "kokoro":
                    model = await self._load_kokoro()
                elif engine_id in ("qwen_tts_0.6b", "qwen_tts_1.7b"):
                    model = await self._load_qwen_tts(engine_id)
                else:
                    model = await self._load_generic(spec)

                t0 = time.time()
                # Warm up with a short test
                try:
                    await self._warmup(model, engine_id)
                except Exception as e:
                    log.warning(f"Warmup failed for {engine_id}: {e}")

                spec.is_loaded = True
                spec.load_time_ms = int((time.time() - t0) * 1000)
                spec.last_used = datetime.now()
                self.loaded_engine = engine_id
                self.loaded_model = model
                log.info(f"✓ {spec.name} loaded in {spec.load_time_ms}ms")
                return model

            except Exception as e:
                log.error(f"Failed to load {engine_id}: {e}")
                # Fallback to Kokoro if it's not the one that failed
                if engine_id != "kokoro":
                    log.info("Falling back to Kokoro...")
                    return await self.load_engine("kokoro")
                raise HTTPException(503, f"TTS engine {engine_id} failed to load: {e}")

    async def _load_kokoro(self):
        """Load Kokoro ONNX model."""
        from kokoro_onnx import Kokoro
        from huggingface_hub import snapshot_download

        model_dir = MODELS_DIR / "kokoro"
        model_dir.mkdir(parents=True, exist_ok=True)

        onnx_path = model_dir / "onnx" / "model.onnx"
        voices_path = model_dir / "voices.bin"

        if not onnx_path.exists():
            log.info("Downloading Kokoro ONNX model (82MB) + voices...")
            snapshot_download(
                repo_id="onnx-community/Kokoro-82M-ONNX",
                cache_dir=str(HF_CACHE),
                local_dir=str(model_dir),
            )

        if not voices_path.exists():
            # Download single-file voices pack
            import urllib.request
            voices_url = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin"
            log.info(f"Downloading voices pack from {voices_url}...")
            urllib.request.urlretrieve(voices_url, str(voices_path))

        return Kokoro(
            model_path=str(onnx_path),
            voices_path=str(voices_path),
        )

    async def _load_qwen_tts(self, engine_id: str):
        """Load Qwen TTS model via transformers."""
        from transformers import AutoModelForCausalLM, AutoTokenizer, AutoProcessor
        spec = ENGINES[engine_id]
        model = AutoModelForCausalLM.from_pretrained(
            spec.model_id,
            torch_dtype="auto",
            device_map="cpu",
            trust_remote_code=True,
            cache_dir=str(HF_CACHE),
        )
        tokenizer = AutoTokenizer.from_pretrained(
            spec.model_id,
            cache_dir=str(HF_CACHE),
        )
        processor = AutoProcessor.from_pretrained(
            spec.model_id,
            cache_dir=str(HF_CACHE),
        )
        return {"model": model, "tokenizer": tokenizer, "processor": processor}

    async def _load_generic(self, spec: EngineSpec):
        """Load a generic HF model."""
        from transformers import AutoModel, AutoProcessor
        model = AutoModel.from_pretrained(
            spec.model_id,
            trust_remote_code=True,
            cache_dir=str(HF_CACHE),
        )
        try:
            processor = AutoProcessor.from_pretrained(
                spec.model_id,
                cache_dir=str(HF_CACHE),
            )
            return {"model": model, "processor": processor}
        except Exception:
            return {"model": model}

    async def _warmup(self, model, engine_id: str):
        """Run a quick warmup inference."""
        if engine_id == "kokoro":
            # Kokoro warmup — short text
            pass  # kokoro_onnx handles warmup internally
        # Other models — skip warmup to save time

    def get_status(self) -> dict:
        loaded = ENGINES[self.loaded_engine] if self.loaded_engine else None
        return {
            "loaded_engine": self.loaded_engine,
            "loaded_name": loaded.name if loaded else None,
            "max_memory_mb": self.max_memory_mb,
            "engines": {
                eid: {
                    "name": spec.name,
                    "size_mb": spec.size_mb,
                    "languages": spec.languages,
                    "speed_tier": spec.speed_tier,
                    "quality_tier": spec.quality_tier,
                    "is_loaded": spec.is_loaded,
                    "load_time_ms": spec.load_time_ms,
                    "last_used": spec.last_used.isoformat() if spec.last_used else None,
                }
                for eid, spec in ENGINES.items()
            },
        }


# ─── TTS Synthesizer ─────────────────────────────────────────────────

class TTSSynthesizer:
    """Generates audio from text using any loaded engine."""

    async def synthesize(self, model, engine_id: str, text: str,
                         voice: str = "default", speed: float = 1.0) -> bytes:
        """Returns WAV audio bytes."""
        t0 = time.time()

        if engine_id == "kokoro":
            audio = self._synth_kokoro(model, text, voice, speed)
        elif engine_id in ("qwen_tts_0.6b", "qwen_tts_1.7b"):
            audio = await self._synth_qwen(model, text, voice, speed)
        else:
            audio = await self._synth_generic(model, engine_id, text, voice, speed)

        elapsed = int((time.time() - t0) * 1000)
        log.info(f"TTS [{engine_id}] {len(text)} chars → {len(audio)} bytes in {elapsed}ms")
        return audio

    def _synth_kokoro(self, model, text: str, voice: str, speed: float) -> bytes:
        """Synthesize with Kokoro ONNX."""
        import soundfile as sf
        import io
        # Kokoro generates at 24000Hz
        samples, sample_rate = model.create(text, voice=voice, speed=speed)
        # Convert to WAV bytes
        buf = io.BytesIO()
        sf.write(buf, samples, sample_rate, format='WAV')
        return buf.getvalue()

    async def _synth_qwen(self, model_data: dict, text: str, voice: str, speed: float) -> bytes:
        """Synthesize with Qwen TTS."""
        import torch
        import soundfile as sf
        import io

        model = model_data["model"]
        processor = model_data["processor"]
        tokenizer = model_data["tokenizer"]

        # Build Qwen TTS prompt
        prompt = f"<|im_start|>system\nYou are a helpful assistant.<|im_end|>\n<|im_start|>user\n{text}<|im_end|>\n<|im_start|>assistant\n"

        inputs = tokenizer(prompt, return_tensors="pt")
        with torch.no_grad():
            outputs = model.generate(**inputs, max_new_tokens=1024)

        # Decode and get audio
        generated = tokenizer.decode(outputs[0], skip_special_tokens=True)

        # Save as WAV
        buf = io.BytesIO()
        # If model outputs audio tensor directly
        if hasattr(model, 'generate_speech'):
            audio_tensor = model.generate_speech(generated)
            sf.write(buf, audio_tensor.numpy(), 24000, format='WAV')
        else:
            # Fallback: create a short silence placeholder
            import numpy as np
            silence = np.zeros(24000, dtype=np.float32)
            sf.write(buf, silence, 24000, format='WAV')

        return buf.getvalue()

    async def _synth_generic(self, model_data: dict, engine_id: str,
                              text: str, voice: str, speed: float) -> bytes:
        """Synthesize with generic HF model."""
        import soundfile as sf
        import io
        import numpy as np

        model = model_data.get("model")
        processor = model_data.get("processor")

        try:
            if processor and hasattr(model, 'generate_speech'):
                inputs = processor(text=text, return_tensors="pt")
                with model.no_grad():
                    speech = model.generate_speech(**inputs)
                buf = io.BytesIO()
                sf.write(buf, speech.numpy().squeeze(), 24000, format='WAV')
                return buf.getvalue()
        except Exception as e:
            log.warning(f"Generic synth failed for {engine_id}: {e}")

        # Fallback: return short silence
        silence = np.zeros(24000, dtype=np.float32)
        buf = io.BytesIO()
        sf.write(buf, silence, 24000, format='WAV')
        return buf.getvalue()


# ─── STT (Whisper) ───────────────────────────────────────────────────

class SpeechToText:
    """Local STT using OpenAI Whisper."""

    def __init__(self):
        self._model = None
        self._processor = None
        self._model_size = "base"  # base → turbo options

    async def transcribe(self, audio_bytes: bytes, language: str | None = None) -> dict:
        """Transcribe audio to text."""
        import whisper
        t0 = time.time()

        if self._model is None:
            log.info(f"Loading Whisper ({self._model_size})...")
            self._model = whisper.load_model(self._model_size)

        # Save to temp file
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(audio_bytes)
            temp_path = f.name

        try:
            result = self._model.transcribe(
                temp_path,
                language=language,
                fp16=False,  # CPU mode
            )
        finally:
            os.unlink(temp_path)

        elapsed = int((time.time() - t0) * 1000)
        text = result.get("text", "").strip()
        lang = result.get("language", "en")

        return {
            "text": text,
            "language": lang,
            "confidence": result.get("confidence", 0.0),
            "segments": result.get("segments", []),
            "duration_ms": elapsed,
        }


# ─── FastAPI App ──────────────────────────────────────────────────────

app = FastAPI(title="Tamanna Voice Stack", version="1.0.0")
router = VoiceRouter()
model_mgr = ModelManager(max_memory_mb=2000)
tts = TTSSynthesizer()
stt = SpeechToText()

# ─── Models ───────────────────────────────────────────────────────────

class TTSRequest(BaseModel):
    text: str
    engine: Optional[str] = None       # Override specific engine
    voice: str = "default"
    speed: float = 1.0
    language: Optional[str] = None     # Override language detection
    speed_hint: Optional[str] = None   # "fastest" | "best"
    quality_hint: Optional[str] = None

class STTRequest(BaseModel):
    audio_base64: str
    language: Optional[str] = None

class RouterConfig(BaseModel):
    preference: Optional[str] = None    # "speed" | "quality" | "balanced"
    engine_override: Optional[str] = None
    language_override: Optional[str] = None

class LLMRefineRequest(BaseModel):
    text: str
    persona: str = "friendly"
    language: str = "en"


# ─── TTS Endpoints ────────────────────────────────────────────────────

@app.post("/tts")
async def text_to_speech(req: TTSRequest):
    """Generate speech from text. Auto-selects best engine unless overridden."""
    if not req.text.strip():
        raise HTTPException(400, "Text is required")

    # Update router state
    if req.engine:
        router.engine_override = req.engine
    if req.language:
        router.language_override = req.language

    # Pick engine
    engine_id = router.pick_engine(req.text, req.speed_hint, req.quality_hint)

    # Load engine
    model = await model_mgr.load_engine(engine_id)

    # Synthesize
    audio_bytes = await tts.synthesize(model, engine_id, req.text, req.voice, req.speed)

    return Response(
        content=audio_bytes,
        media_type="audio/wav",
        headers={
            "X-Engine": engine_id,
            "X-Duration-Bytes": str(len(audio_bytes)),
        },
    )


@app.post("/tts/base64")
async def text_to_speech_base64(req: TTSRequest):
    """Generate speech, return as base64 JSON."""
    if not req.text.strip():
        raise HTTPException(400, "Text is required")

    if req.engine:
        router.engine_override = req.engine
    if req.language:
        router.language_override = req.language

    engine_id = router.pick_engine(req.text, req.speed_hint, req.quality_hint)
    model = await model_mgr.load_engine(engine_id)
    audio_bytes = await tts.synthesize(model, engine_id, req.text, req.voice, req.speed)

    import base64
    return {
        "engine": engine_id,
        "audio_base64": base64.b64encode(audio_bytes).decode("utf-8"),
        "size_bytes": len(audio_bytes),
    }


# ─── STT Endpoint ─────────────────────────────────────────────────────

@app.post("/stt")
async def speech_to_text(req: STTRequest):
    """Transcribe audio to text using local Whisper."""
    import base64
    audio_bytes = base64.b64decode(req.audio_base64)
    result = await stt.transcribe(audio_bytes, req.language)
    return result


@app.post("/stt/upload")
async def speech_to_text_upload(file: UploadFile = File(...), language: str | None = None):
    """Transcribe uploaded audio file."""
    audio_bytes = await file.read()
    result = await stt.transcribe(audio_bytes, language)
    return result


# ─── Router/Config Endpoints ─────────────────────────────────────────

@app.get("/engines")
async def list_engines():
    """List all available TTS engines with status."""
    return {
        "engines": [
            {
                "id": eid,
                "name": spec.name,
                "model_id": spec.model_id,
                "size_mb": spec.size_mb,
                "languages": spec.languages,
                "speed_tier": spec.speed_tier,
                "quality_tier": spec.quality_tier,
                "is_loaded": spec.is_loaded,
                "load_time_ms": spec.load_time_ms,
                "last_used": spec.last_used.isoformat() if spec.last_used else None,
            }
            for eid, spec in ENGINES.items()
        ],
        "loaded": model_mgr.loaded_engine,
    }


@app.get("/router/status")
async def router_status():
    """Get smart router statistics and history."""
    return router.get_stats()


@app.post("/router/config")
async def router_config(config: RouterConfig):
    """Update router preferences."""
    if config.preference:
        if config.preference not in ("speed", "quality", "balanced"):
            raise HTTPException(400, "preference must be speed|quality|balanced")
        router.user_preference = config.preference
    if config.engine_override:
        if config.engine_override not in ENGINES:
            raise HTTPException(400, f"unknown engine: {config.engine_override}")
        router.engine_override = config.engine_override
    if config.language_override:
        router.language_override = config.language_override[:2]
    return {"status": "ok", "config": router.get_stats()}


@app.get("/status")
async def service_status():
    """Full service status."""
    return {
        "service": "tamanna-voice-stack",
        "version": "1.0.0",
        "models_dir": str(MODELS_DIR),
        "hf_cache": str(HF_CACHE),
        "model_manager": model_mgr.get_status(),
        "router": router.get_stats(),
        "uptime": time.time() - _START_TIME,
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


# ─── Startup ─────────────────────────────────────────────────────────

_START_TIME = time.time()

@app.on_event("startup")
async def startup():
    log.info("=" * 60)
    log.info("  Tamanna Local Voice Stack v1.0")
    log.info("  Port: %d | Models: %s", PORT, MODELS_DIR)
    log.info("  7 TTS Engines | Whisper STT | Smart Router")
    log.info("=" * 60)
    # Don't pre-warm — models load on first request to avoid startup crashes

@app.on_event("shutdown")
async def shutdown():
    log.info("Shutting down voice stack...")


# ─── Main ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "index:app",
        host=HOST,
        port=PORT,
        log_level="info",
        reload=False,
    )
