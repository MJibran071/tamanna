import { getZAI } from '../services/zai.js';
import type { SubAgent, SubAgentResult, AgentContext } from './types';

export default class VLMAgent implements SubAgent {
  name = 'vlm';
  description = 'Vision Language Model that analyzes and describes images. Can answer questions about image content, describe scenes, read text in images, and identify objects.';

  async execute(input: any, context: AgentContext): Promise<SubAgentResult> {
    const startTime = Date.now();
    const question: string = input?.question || 'Describe this image in detail.';
    const imageUrl: string = input?.image_url || '';
    const imageBase64: string = input?.image_base64 || '';

    if (!imageUrl && !imageBase64) {
      const result: SubAgentResult = {
        success: false,
        response: 'No image provided. Please provide an image URL or base64-encoded image data.',
        metadata: { duration_ms: Date.now() - startTime, agent: this.name },
        error: 'MISSING_IMAGE',
      };
      context.memoryEngine?.recordAgentOutcome({
        agent: this.name, success: false, input, output: result, durationMs: result.metadata.duration_ms, error: 'MISSING_IMAGE',
      });
      return result;
    }

    try {
      if (context.abortSignal?.aborted) throw new Error('ABORTED');
      const zai = await getZAI();
      if (context.abortSignal?.aborted) throw new Error('ABORTED');

      // Build messages array with image content
      const messages: any[] = [
        {
          role: 'system',
          content: 'You are an expert image analyst. Provide detailed, accurate descriptions of images. If asked a specific question about the image, answer it directly and concisely.',
        },
        {
          role: 'user',
          content: [],
        },
      ];

      // Add the image
      const userContent: any = {
        type: 'text',
        text: question,
      };
      messages[1].content.push(userContent);

      if (imageUrl) {
        messages[1].content.push({
          type: 'image_url',
          image_url: { url: imageUrl },
        });
      } else if (imageBase64) {
        const dataUrl = imageBase64.startsWith('data:')
          ? imageBase64
          : `data:image/png;base64,${imageBase64}`;
        messages[1].content.push({
          type: 'image_url',
          image_url: { url: dataUrl },
        });
      }

      const completion = await zai.chat.completions.create({
        model: 'default',
        messages,
      });

      if (context.abortSignal?.aborted) throw new Error('ABORTED');

      const responseText = completion?.choices?.[0]?.message?.content
        || completion?.content
        || 'Image analysis completed but no description was generated.';

      const durationMs = Date.now() - startTime;
      const result: SubAgentResult = {
        success: true,
        response: responseText,
        artifacts: { question, hadImageUrl: !!imageUrl, hadImageBase64: !!imageBase64 },
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
        response: isAborted ? 'Image analysis was cancelled.' : `Image analysis failed: ${errorMsg}`,
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

export { VLMAgent };
