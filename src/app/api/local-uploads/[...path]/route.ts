import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const UPLOAD_ROOT = resolve(/* turbopackIgnore: true */ process.cwd(), "public", "uploads");

const CONTENT_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

export function resolveLocalUploadPath(segments: string[]): string | null {
  if (segments.length === 0 || segments.some((segment) => !segment || segment.includes("\0"))) {
    return null;
  }

  const candidate = resolve(/* turbopackIgnore: true */ UPLOAD_ROOT, ...segments);
  const rootPrefix = `${UPLOAD_ROOT}${sep}`.toLocaleLowerCase("en-US");
  return candidate.toLocaleLowerCase("en-US").startsWith(rootPrefix) ? candidate : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const filePath = resolveLocalUploadPath(path);
  if (!filePath) return new Response("Not Found", { status: 404 });

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) return new Response("Not Found", { status: 404 });

    const file = await readFile(filePath);
    const contentType = CONTENT_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream";

    return new Response(new Uint8Array(file), {
      headers: {
        "Cache-Control": "public, max-age=0",
        "Content-Length": String(file.byteLength),
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    if (code === "ENOENT" || code === "ENOTDIR") {
      return new Response("Not Found", { status: 404 });
    }

    console.error("[LOCAL_UPLOAD_ROUTE] Failed to serve upload:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
