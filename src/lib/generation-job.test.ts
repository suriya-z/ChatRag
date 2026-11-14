import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { getActiveImageProvider } from './generation-job.ts';

const keys = ['USE_OPENAI_IMAGE', 'USE_REPLICATE_PROVIDER', 'IMAGE_GENERATION_PROVIDER'] as const;
const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
});

describe('getActiveImageProvider', () => {
  it('prefers the openai flag, then replicate, then the named host', () => {
    process.env.USE_OPENAI_IMAGE = 'true';
    process.env.USE_REPLICATE_PROVIDER = 'true';
    process.env.IMAGE_GENERATION_PROVIDER = 'fal';
    assert.equal(getActiveImageProvider(), 'openai');

    delete process.env.USE_OPENAI_IMAGE;
    assert.equal(getActiveImageProvider(), 'replicate');

    delete process.env.USE_REPLICATE_PROVIDER;
    assert.equal(getActiveImageProvider(), 'fal');

    delete process.env.IMAGE_GENERATION_PROVIDER;
    assert.equal(getActiveImageProvider(), 'fal');
  });
});
