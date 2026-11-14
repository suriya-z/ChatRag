/** Image host selection. Three hosts vary across this seam: openai, replicate, fal. */
export function getActiveImageProvider(): string {
  if (process.env.USE_OPENAI_IMAGE === 'true') return 'openai';
  if (process.env.USE_REPLICATE_PROVIDER === 'true') return 'replicate';
  return process.env.IMAGE_GENERATION_PROVIDER || 'fal';
}
