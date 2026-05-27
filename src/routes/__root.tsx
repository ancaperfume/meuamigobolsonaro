import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";

const META_PIXEL_ID = "27126474183629240";

// 👉 Cole aqui seu TikTok Pixel ID (ex: "C39HB48J098UY76H5G20")
//    Quando vazio, nenhum script é carregado.
const TIKTOK_PIXEL_ID = "D8BECBBC77UBL2TTSIF0";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Meu Amigo Bolsonaro" },
      { name: "facebook-domain-verification", content: "SEU_CODIGO_AQUI" },
      {
        name: "description",
        content: "Create AI-generated photos with Brazilian political figures.",
      },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Meu Amigo Bolsonaro" },
      {
        property: "og:description",
        content: "Create AI-generated photos with Brazilian political figures.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Meu Amigo Bolsonaro" },
      {
        name: "twitter:description",
        content: "Create AI-generated photos with Brazilian political figures.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/dd6b2bed-4234-4864-9e8d-81396c893276/id-preview-ad4563a5--14abfb64-7c25-4b6e-b573-5a86b49933f1.lovable.app-1779814464564.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/dd6b2bed-4234-4864-9e8d-81396c893276/id-preview-ad4563a5--14abfb64-7c25-4b6e-b573-5a86b49933f1.lovable.app-1779814464564.png",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {META_PIXEL_ID && (
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        )}
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as any;

    // 1. Initialize Meta Pixel
    if (META_PIXEL_ID && !w.fbq) {
      const n: any = (w.fbq = function (...args: any[]) {
        n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
      });
      if (!w._fbq) w._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      const t = document.createElement("script");
      t.async = true;
      t.src = "https://connect.facebook.net/en_US/fbevents.js";
      const s = document.getElementsByTagName("script")[0];
      s?.parentNode?.insertBefore(t, s);
      w.fbq("init", META_PIXEL_ID);
      w.fbq("track", "PageView");
    }

    // 2. Initialize TikTok Pixel
    if (TIKTOK_PIXEL_ID && !w.ttq) {
      w.TiktokAnalyticsObject = "ttq";
      const ttq: any = (w.ttq = w.ttq || []);
      ttq.methods = [
        "page",
        "track",
        "identify",
        "instances",
        "debug",
        "on",
        "off",
        "once",
        "ready",
        "alias",
        "group",
        "enableCookie",
        "disableCookie",
        "holdConsent",
        "revokeConsent",
        "grantConsent",
      ];
      ttq.setAndDefer = function (t: any, e: any) {
        t[e] = function () {
          t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
        };
      };
      for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function (t: any) {
        const e = w[t]?._rgba || [];
        for (let n = 0; n < e.length; n++) ttq.setAndDefer(ttq, e[n]);
        return ttq;
      };
      ttq.load = function (e: any, n: any) {
        const o = "https://analytics.tiktok.com/i18n/pixel/events.js";
        ttq._i = ttq._i || {};
        ttq._i[e] = [];
        ttq._i[e]._u = o;
        ttq._t = ttq._t || [];
        ttq._t.push(e);
        ttq._o = ttq._o || {};
        ttq._o[e] = n || {};
        const c = document.createElement("script");
        c.type = "text/javascript";
        c.async = true;
        c.src = o + "?sdkid=" + e + "&lib=ttq";
        const a = document.getElementsByTagName("script")[0];
        a?.parentNode?.insertBefore(c, a);
      };
      ttq.load(TIKTOK_PIXEL_ID);
      ttq.page();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
