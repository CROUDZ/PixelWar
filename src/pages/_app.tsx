import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import type { Session } from "next-auth";
import { LazyMotion, domAnimation } from "framer-motion";
import "@/styles/globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import WSListener from "@/components/WSListener";
import { EventModeProvider } from "@/context/EventMode";
import { useEffect } from "react";

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
    // Vérifier si l'intervalle de capture n'est pas déjà actif
    if (
      typeof window !== "undefined" &&
      !(window as { captureInterval?: NodeJS.Timeout }).captureInterval
    ) {
      const capture = async () => {
        try {
          await fetch("/api/capture", { method: "POST" });
          console.log("Capture API called successfully.");
        } catch (error: unknown) {
          console.error("Error calling Capture API:", error);
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
