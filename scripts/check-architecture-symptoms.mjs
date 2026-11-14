#!/usr/bin/env node
/**
 * Regression loop for the architecture symptoms fixed in this change.
 * Exits 1 while any symptom is still present.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve, join } from 'node:path';

const root = resolve(process.argv[2] || new URL('..', import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(root, rel), 'utf8');

const failures = [];
function check(name, ok, detail) {
  if (!ok) failures.push({ name, detail });
  else console.log(`PASS  ${name}`);
}

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === 'WAProto') continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry)) acc.push(full);
  }
  return acc;
}

const srcFiles = walk(resolve(root, 'src'));
const countFn = (src, name) => (src.match(new RegExp(`function ${name}\\b`, 'g')) || []).length;

const rel = (file) => relative(root, file);
const emailFiles = srcFiles.filter((file) => countFn(read(rel(file)), 'analyzeEmailIntent') > 0);
check(
  'email-intent-single-definition',
  emailFiles.length === 1 && emailFiles[0].endsWith('src/lib/email-intent.ts'),
  `analyzeEmailIntent defined in ${emailFiles.join(', ') || 'nowhere'}`
);

const yoloFiles = srcFiles.filter((file) => read(rel(file)).includes('YOLO mode enabled'));
check(
  'yolo-single-execute-path',
  yoloFiles.length === 1 && yoloFiles[0].endsWith('src/lib/mcp/tool-invocation.ts'),
  `YOLO log lives in ${yoloFiles.join(', ') || 'nowhere'}`
);

const globalApproval = srcFiles.filter((file) => {
  const text = read(rel(file));
  return /globalThis(?:\s+as\s+\w+\s*)?\.toolApprovalState|\bglobal\.toolApprovalState/.test(text);
});
check(
  'approval-owned-by-one-module',
  globalApproval.length === 0 && read('src/lib/process-slots.ts').includes('function ensureToolApprovalState'),
  `approval global touched by ${globalApproval.map(rel).join(', ') || 'nobody'}`
);

const chat = read('src/app/api/chat/route.ts');
check(
  'rag-dead-import-gone',
  !chat.includes('comprehensiveRetrieval') && !chat.includes('optimizedSearch') && !chat.includes('intelligentSearch'),
  'chat POST still imports an unused retrieval module'
);

const video = read('src/app/api/generate-video/route.ts');
check(
  'video-uses-shared-rag',
  !video.includes('getDocumentContext') && !video.includes('match_document_chunks') && video.includes('retrieveContextText'),
  'video POST still owns a private chunk match'
);

const page = read('src/app/page.tsx');
const message = read('src/components/ui/chat-message.tsx');
check(
  'stream-reducer-module',
  !page.includes('const handleSseEvent') &&
    page.includes('handleChatStreamEvent') &&
    !message.includes('function extractApprovalNeededToolCall') &&
    message.includes("from '@/lib/approval-text'"),
  'stream events or approval text are still parsed in the page or message module'
);

const router = read('src/lib/mcp/production-router.ts');
check(
  'tool-cache-not-inline-global',
  !router.includes('global_cache') && !router.includes('globalThis') && router.includes('session-tool-cache'),
  'production router still owns the sessionTools global'
);

const image = read('src/app/api/generate-image/route.ts');
check(
  'generation-provider-module',
  !image.includes('function getActiveProvider') && image.includes('getActiveImageProvider'),
  'image POST still owns provider selection'
);

const catalog = JSON.parse(read('src/lib/model-catalog.json'));
const initEnv = read('scripts/init-env.js');
const configServer = read('scripts/config-server.js');
const envTs = read('src/lib/env.ts');
const configUi = read('scripts/config-ui/index.html');
const readsCatalog = (src) => src.includes('model-catalog.json') && !src.includes('claude-sonnet-4.5');
check(
  'model-catalog-single-source',
  readsCatalog(initEnv) && readsCatalog(configServer) && readsCatalog(envTs) &&
    (configUi.match(/claude-sonnet-4\.5/g) || []).length === 0 &&
    configUi.includes('loadModelCatalog') &&
    catalog.openrouter.some((model) => model.id === 'openai/gpt-5.2-chat') &&
    catalog.openrouter.some((model) => model.id === 'openai/gpt-4.1') &&
    catalog.groq.some((model) => model.id === 'llama-3.3-70b-versatile'),
  'model catalog is still copied instead of read from src/lib/model-catalog.json'
);

if (failures.length) {
  console.log(`\nRED  ${failures.length} symptom(s)`);
  for (const failure of failures) console.log(`\n- ${failure.name}\n  ${failure.detail}`);
  process.exit(1);
}
console.log('\nGREEN  architecture symptoms are gone');
