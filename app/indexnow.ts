import { siteUrl } from "./seo";

export const indexNowKey = "9c873a63e0cec3820277dd94dc387135";

function absoluteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}

export async function notifyIndexNow(paths: readonly string[]) {
  const urlList = [...new Set(paths.map(absoluteUrl))];
  if (urlList.length === 0) return;

  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(siteUrl).hostname,
        key: indexNowKey,
        keyLocation: `${siteUrl}/${indexNowKey}.txt`,
        urlList,
      }),
      signal: AbortSignal.timeout(4_000),
      cache: "no-store",
    });

    if (!response.ok && response.status !== 202) {
      console.warn(`IndexNow returned ${response.status}.`);
    }
  } catch (error) {
    console.warn("IndexNow notification failed without affecting the admin update.", error);
  }
}
