import fs from 'node:fs/promises';
import path from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';

const SLIDE_ID_RE = /^[a-z0-9_-]+$/i;

export type CurrentPluginOptions = {
  userCwd: string;
  slidesDir?: string;
};

type IncomingPayload = {
  slideId?: unknown;
  pageIndex?: unknown;
  totalPages?: unknown;
  slideTitle?: unknown;
  view?: unknown;
};

export function currentPlugin(opts: CurrentPluginOptions): Plugin {
  const userCwd = opts.userCwd;
  const slidesDir = opts.slidesDir ?? 'slides';
  const outDir = path.join(userCwd, 'node_modules', '.open-slide');
  const outFile = path.join(outDir, 'current.json');
  const tmpFile = `${outFile}.tmp`;

  return {
    name: 'open-slide:current',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      server.ws.on('open-slide:current', async (raw: IncomingPayload) => {
        const slideId = typeof raw?.slideId === 'string' ? raw.slideId : '';
        if (!slideId || !SLIDE_ID_RE.test(slideId)) return;

        const totalPages =
          typeof raw.totalPages === 'number' &&
          Number.isFinite(raw.totalPages) &&
          raw.totalPages > 0
            ? Math.floor(raw.totalPages)
            : 1;
        const rawIndex =
          typeof raw.pageIndex === 'number' && Number.isFinite(raw.pageIndex)
            ? Math.floor(raw.pageIndex)
            : 0;
        const pageIndex = Math.max(0, Math.min(totalPages - 1, rawIndex));
        const slideTitle = typeof raw.slideTitle === 'string' ? raw.slideTitle : slideId;
        const view = raw.view === 'assets' ? 'assets' : 'slides';

        const pagePath = path.join(slidesDir, slideId, 'index.tsx').split(path.sep).join('/');

        const body = {
          slideId,
          pageIndex,
          pageNumber: pageIndex + 1,
          totalPages,
          slideTitle,
          view,
          pagePath,
          updatedAt: new Date().toISOString(),
        };

        try {
          await fs.mkdir(outDir, { recursive: true });
          await fs.writeFile(tmpFile, `${JSON.stringify(body, null, 2)}\n`, 'utf8');
          await fs.rename(tmpFile, outFile);
        } catch {
          // Best-effort: a transient FS error here shouldn't crash the dev server.
        }
      });
    },
  };
}
