import { getZAI } from './zai';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

/**
 * Transcribe base64-encoded audio to text using ZAI ASR.
 * Retries up to MAX_RETRIES times with exponential backoff.
 */
export async function transcribe(base64Audio: string): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const zai = await getZAI();
      const response = await zai.audio.asr.create({
        file_base64: base64Audio,
      });
      const text = response?.text || '';
      console.log(`[ASR] Transcription successful (attempt ${attempt}): "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`);
      return text;
    } catch (err: any) {
      lastError = err;
      console.warn(`[ASR] Attempt ${attempt}/${MAX_RETRIES} failed: ${err?.message || err}`);

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`[ASR] Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  console.error(`[ASR] All ${MAX_RETRIES} attempts failed.`);
  throw lastError || new Error('ASR transcription failed after all retries');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
