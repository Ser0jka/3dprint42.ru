"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const METRIKA_COUNTER_ID = 111840907;
export const METRIKA_CONSENT_COOKIE = "3dprint42_cookie_consent_v1";

const AI_REFERRERS: Record<string, string> = {
  "chatgpt.com": "chatgpt",
  "chat.openai.com": "chatgpt",
  "perplexity.ai": "perplexity",
  "copilot.microsoft.com": "copilot",
  "gemini.google.com": "gemini",
};

type YandexMetrika = ((...args: unknown[]) => void) & {
  a?: unknown[][];
  l?: number;
};

export type MetrikaGoal =
  | "phone_click"
  | "telegram_click"
  | "vk_click"
  | "max_click"
  | "catalog_open"
  | "catalog_model_open"
  | "calculator_calculate"
  | "calculator_request"
  | "quiz_start"
  | "quiz_complete"
  | "quiz_submit"
  | "form_submit";

declare global {
  interface Window {
    ym?: YandexMetrika;
    __ymCounter111840907Initialized?: boolean;
  }
}

export function initYandexMetrika() {
  if (typeof window === "undefined") return;
  if (window.__ymCounter111840907Initialized) return;

  let ym = window.ym;
  if (!ym) {
    const queue = ((...args: unknown[]) => {
      queue.a = queue.a || [];
      queue.a.push(args);
    }) as YandexMetrika;
    queue.l = Date.now();
    ym = queue;
    window.ym = queue;
  }

  if (!document.getElementById("yandex-metrika-script")) {
    const script = document.createElement("script");
    script.id = "yandex-metrika-script";
    script.async = true;
    script.src = "https://mc.yandex.ru/metrika/tag.js?id=111840907";
    document.head.appendChild(script);
  }

  window.__ymCounter111840907Initialized = true;
  ym(METRIKA_COUNTER_ID, "init", {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: "dataLayer",
    referrer: document.referrer,
    url: location.href,
    accurateTrackBounce: true,
    trackLinks: true,
  });
}

export function reachMetrikaGoal(
  goal: MetrikaGoal,
  params?: Record<string, string | number | boolean>,
) {
  if (typeof window === "undefined") return;

  let attempts = 0;
  const send = () => {
    if (typeof window.ym === "function") {
      window.ym(METRIKA_COUNTER_ID, "reachGoal", goal, params);
      return;
    }

    attempts += 1;
    if (attempts < 50) window.setTimeout(send, 100);
  };

  send();
}

function getLinkGoal(link: HTMLAnchorElement): MetrikaGoal | null {
  const href = link.getAttribute("href")?.trim();

  if (!href) return null;
  if (href.toLowerCase().startsWith("tel:")) return "phone_click";

  try {
    const hostname = new URL(href, window.location.href).hostname.replace(/^www\./, "").toLowerCase();

    if (hostname === "t.me" || hostname === "telegram.me") return "telegram_click";
    if (hostname === "vk.com") return "vk_click";
    if (hostname === "max.ru") return "max_click";
  } catch {
    return null;
  }

  return null;
}

export default function MetrikaGoals() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    initYandexMetrika();

    try {
      const hostname = new URL(document.referrer).hostname.replace(/^www\./, "").toLowerCase();
      const aiSource = AI_REFERRERS[hostname];
      if (aiSource) window.ym?.(METRIKA_COUNTER_ID, "params", { ai_referral_source: aiSource });
    } catch {
      // Direct visits do not have a referrer.
    }
  }, []);

  useEffect(() => {
    if (pathname === "/katalog-3d-modelej" && lastTrackedPath.current !== pathname) {
      reachMetrikaGoal("catalog_open");
    }

    lastTrackedPath.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const trackContactClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;

      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link) return;

      const goal = getLinkGoal(link);
      if (goal) reachMetrikaGoal(goal);
    };

    document.addEventListener("click", trackContactClick, true);
    return () => document.removeEventListener("click", trackContactClick, true);
  }, []);

  return null;
}
