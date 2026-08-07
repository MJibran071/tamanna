import { getZAI } from '../services/zai.js';
import type { SubAgent, SubAgentResult, AgentContext } from './types';

const SUPPORTED_SIZES = [
  '1024x1024', '768x1344', '864x1152',
  '1344x768', '1152x864', '1440x720', '720x1440',
] as const;

type SupportedSize = (typeof SUPPORTED_SIZES)[number];

function isValidSize(size: string): size is SupportedSize {
  return (SUPPORTED_SIZES as readonly string[]).includes(size);
}

export default class ImageGenAgent implements SubAgent {
  name = 'image_gen';
  description = 'Generates images from text descriptions using AI image generation. Supports multiple aspect ratios including square, portrait, and landscape.';

  async execute(input: any, context: AgentContext): Promise<SubAgentResult> {
    const startTime = Date.now();
    const prompt: string = input?.prompt || '';
    const requestedSize: string = input?.size || '1024x1024';
    const size: SupportedSize = isValidSize(requestedSize) ? requestedSize : '1024x1024';

    if (!prompt.trim()) {
      const result: SubAgentResult = {
        success: false,
        response: 'No image prompt provided. Please describe the image you want to generate.',
        metadata: { duration_ms: Date.now() - startTime, agent: this.name },
        error: 'MISSING_PROMPT',
      };
      context.memoryEngine?.recordAgentOutcome({
        agent: this.name, success: false, input, output: result, durationMs: result.metadata.duration_ms, error: 'MISSING_PROMPT',
      });
      return result;
    }

    try {
      if (context.abortSignal?.aborted) {
        throw new Error('ABORTED');
      }

      const zai = await getZAI();

      if (context.abortSignal?.aborted) {
        throw new Error('ABORTED');
      }

      const imageResult = await zai.images.generations.create({ prompt, size });

      if (context.abortSignal?.aborted) {
        throw new Error('ABORTED');
      }

      let base64Data = '';
      let imageUrl = '';

      if (imageResult?.data && Array.isArray(imageResult.data) && imageResult.data.length > 0) {
        const img = imageResult.data[0];
        base64Data = img.b64_json || img.base64 || '';
        imageUrl = img.url || '';
      } else if (imageResult?.b64_json) {
        base64Data = imageResult.b64_json;
      } else if (imageResult?.url) {
        imageUrl = imageResult.url;
      } else if (typeof imageResult === 'string') {
        if (imageResult.startsWith('data:') || imageResult.startsWith('/9j/') || imageResult.startsWith('iVBOR')) {
          base64Data = imageResult;
        } else {
          imageUrl = imageResult;
        }
      }

      if (!base64Data && !imageUrl) {
        const result: SubAgentResult = {
          success: false,
          response: 'Image generation completed but no image data was returned.',
          metadata: { duration_ms: Date.now() - startTime, agent: this.name },
          error: 'NO_IMAGE_DATA',
        };
        context.memoryEngine?.recordAgentOutcome({
          agent: this.name, success: false, input, output: result, durationMs: result.metadata.duration_ms, error: 'NO_IMAGE_DATA',
        });
        return result;
      }

      const artifacts: Record<string, any> = { prompt, size };
      if (base64Data) {
        artifacts.image_base64 = base64Data;
        artifacts.image_data_url = `data:image/png;base64,${base64Data}`;
      }
      if (imageUrl) {
        artifacts.image_url = imageUrl;
      }

      const responseText = base64Data
        ? `Image generated successfully! Size: ${size}. The image has been encoded as base64 data.`
        : `Image generated successfully! Size: ${size}. Image URL: ${imageUrl}`;

      const durationMs = Date.now() - startTime;
      const result: SubAgentResult = {
        success: true,
        response: responseText,
        artifacts,
        metadata: { duration_ms: durationMs, agent: this.name },
      };

      context.memoryEngine?.recordAgentOutcome({
        agent: this.name, success: true, input, output: result, durationMs,
      });

      return result;
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      const isAborted = errorMsg === 'ABORTED';
      const durationMs = Date.now() - startTime;
      const result: SubAgentResult = {
        success: false,
        response: isAborted ? 'Image generation was cancelled.' : `Image generation failed: ${errorMsg}`,
        metadata: { duration_ms: durationMs, agent: this.name },
        error: isAborted ? 'ABORTED' : errorMsg,
      };

      context.memoryEngine?.recordAgentOutcome({
        agent: this.name, success: false, input, output: result, durationMs, error: errorMsg,
      });

      return result;
    }
  }
}

export { ImageGenAgent };
