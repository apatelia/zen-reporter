import type { TestResult } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';
import type { TestCase as TestCaseModel } from './types/report';

/**
 * Resolves a file extension based on content type and attachment name.
 *
 * @param contentType - MIME content type.
 * @param name - Original attachment name.
 * @param isText - Whether the file is detected as text.
 * @returns File extension starting with dot.
 */
function resolveAttachmentExtension(
  contentType?: string,
  name?: string,
  isText: boolean = false
): string {
  const nameExt = name ? path.extname(name) : '';
  if (nameExt && nameExt.length > 1) {
    return nameExt;
  }

  if (contentType === 'image/png') return '.png';
  if (contentType === 'image/jpeg') return '.jpg';
  if (contentType === 'image/webp') return '.webp';
  if (contentType === 'image/svg+xml') return '.svg';
  if (contentType === 'video/webm') return '.webm';
  if (contentType === 'video/mp4') return '.mp4';
  if (contentType === 'application/zip') return '.zip';
  if (contentType === 'application/json' || name?.endsWith('.json')) return '.json';
  if (contentType === 'text/html' || name?.endsWith('.html')) return '.html';
  if (contentType === 'text/markdown' || name?.endsWith('.md')) return '.md';
  if (contentType === 'text/javascript' || contentType === 'application/javascript') return '.js';
  if (contentType === 'text/plain' || isText) return '.txt';

  return '.bin';
}

/**
 * Copies test result attachments to output directory and formats attachment models.
 *
 * @param testId - Playwright test ID.
 * @param rawAttachments - List of raw Playwright attachments.
 * @param outputDirName - Relative or absolute output directory name.
 * @returns Formatted list of attachments, or undefined if empty.
 */
export function processAttachments(
  testId: string,
  rawAttachments: TestResult['attachments'],
  outputDirName: string
): TestCaseModel['attachments'] {
  if (!rawAttachments || rawAttachments.length === 0) return undefined;

  const cwd = process.cwd();
  const normalizedCwd = cwd.endsWith('/') ? cwd.slice(0, -1) : cwd;
  const outputDir = path.resolve(normalizedCwd, outputDirName);
  const attachmentsDir = path.join(outputDir, 'attachments');

  const result = rawAttachments.map((att, attIdx) => {
    let finalPath: string | null = att.path || null;

    const isText =
      att.contentType?.startsWith('text/') ||
      /\.(txt|log|json|csv|html|xml|md|yaml|yml|js|ts|jsx|tsx|css)$/i.test(
        att.name || att.path || ''
      );

    if (att.path && fs.existsSync(att.path)) {
      try {
        fs.mkdirSync(attachmentsDir, { recursive: true });
        const safeName = path.basename(att.path).replace(/[^a-zA-Z0-9._-]/g, '_');
        const safeTestId = testId.replace(/[^a-zA-Z0-9_-]/g, '_');
        const targetFilename = `${safeTestId}_att${attIdx}_${safeName}`;
        const targetPath = path.join(attachmentsDir, targetFilename);
        fs.copyFileSync(att.path, targetPath);
        finalPath = `./attachments/${targetFilename}`;
      } catch (e) {
        console.error(`Failed to copy attachment file from ${att.path}:`, e);
      }
    } else if (att.body) {
      try {
        fs.mkdirSync(attachmentsDir, { recursive: true });

        const ext = resolveAttachmentExtension(att.contentType, att.name, isText);
        const safeTestId = testId.replace(/[^a-zA-Z0-9_-]/g, '_');
        const targetFilename = `${safeTestId}_att${attIdx}${ext}`;
        const targetPath = path.join(attachmentsDir, targetFilename);
        const buf = Buffer.isBuffer(att.body) ? att.body : Buffer.from(att.body);

        fs.writeFileSync(targetPath, buf);
        finalPath = `./attachments/${targetFilename}`;
      } catch (e) {
        console.error('Failed to write in-memory attachment to disk:', e);
      }
    }

    let bodyContent: string | null = null;
    if (att.body) {
      if (isText) {
        bodyContent = Buffer.isBuffer(att.body) ? att.body.toString('utf8') : String(att.body);
      } else {
        bodyContent = Buffer.isBuffer(att.body) ? att.body.toString('base64') : String(att.body);
      }
    } else if (isText && att.path && fs.existsSync(att.path)) {
      try {
        // Embed text attachment content in body so file:// previews work offline & without CORS blocks
        bodyContent = fs.readFileSync(att.path, 'utf8');
      } catch (e) {
        console.error(`Failed to read text attachment file from ${att.path}:`, e);
      }
    }

    return {
      name: att.name,
      contentType: att.contentType,
      path: finalPath,
      body: bodyContent,
    };
  });

  return result.length > 0 ? result : undefined;
}
