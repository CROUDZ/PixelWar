import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import type { Session } from "next-auth";
import { LazyMotion, domAnimation } from "framer-motion";
import "@/styles/globals.css";
import "@/styles/animations.css";
import { ThemeProvider } from "@/context/ThemeContext";
import WSListener from "@/components/WSListener";
import { EventModeProvider } from "@/context/EventMode";
import { useEffect } from "react";

const ENV = process.env.NODE_ENV || "development";
const DOMAIN =
  ENV === "production"
    ? "https://pixelwar-hubdurp.fr"
    : "http://localhost:3000";

type AppPropsWithAuth = AppProps & {
  pageProps: {
    session?: Session;
  };
};

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppPropsWithAuth) {
  useEffect(() => {
    console.log("[ENV] (FR)", ENV, " - DOMAINE :", DOMAIN);

    // Vérifier si l'intervalle de capture n'est pas déjà actif
    if (
      typeof window !== "undefined" &&
      !(window as { captureInterval?: NodeJS.Timeout }).captureInterval
    ) {
      const capture = async () => {
        try {
          await fetch("/api/capture", { method: "POST" });
          console.log("Capture API appelée avec succès.");
        } catch (error: unknown) {
          console.error("Erreur lors de l'appel à l'API Capture :", error);
        }
      };

      // Première capture dans 30 minutes (pas immédiatement)
      const interval = setInterval(capture, 30 * 60 * 1000); // 30 minutes
      (window as { captureInterval?: NodeJS.Timeout }).captureInterval =
        interval;

      return () => {
        if ((window as { captureInterval?: NodeJS.Timeout }).captureInterval) {
          clearInterval(
            (window as { captureInterval?: NodeJS.Timeout }).captureInterval,
          );
          delete (window as { captureInterval?: NodeJS.Timeout })
            .captureInterval;
        }
      };
    }
  }, []);

  return (
    <SessionProvider session={session}>
      <ThemeProvider>
        <EventModeProvider>
          <LazyMotion features={domAnimation}>
            <WSListener />
            <Component {...pageProps} />
          </LazyMotion>
        </EventModeProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
