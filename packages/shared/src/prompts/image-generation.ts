export const IMAGE_GENERATION_SYSTEM_PROMPT = `Generate the requested image based on the inputs. Return only the image file or raw Base64 string. No conversational text, markdown, or explanations.`;

export function buildImageGenerationPrompt(prompt: string): string {
  return `${prompt}\n\nReturn the result as a Base64 encoded string of the image. No markdown formatting or prefixes. Just the raw base64 string.`;
}
