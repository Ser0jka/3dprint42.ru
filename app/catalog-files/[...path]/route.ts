import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { uploadsDirectory } from "../../catalog-store";

const contentTypes: Record<string, string> = {
  ".stl": "model/stl",
  ".step": "model/step",
  ".stp": "model/step",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
};

export async function GET(_request: Request, context: RouteContext<"/catalog-files/[...path]">) {
  const { path: segments } = await context.params;
  if (segments.length !== 1 || path.basename(segments[0]) !== segments[0]) return new Response(null, { status: 404 });

  const filename = segments[0];
  const extension = path.extname(filename).toLowerCase();
  const contentType = contentTypes[extension];
  if (!contentType) return new Response(null, { status: 404 });

  const filePath = path.join(uploadsDirectory(), filename);
  try {
    const [bytes, information] = await Promise.all([readFile(filePath), stat(filePath)]);
    return new Response(bytes, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(information.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
