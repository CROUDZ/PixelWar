import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import { LazyMotion, domAnimation } from "framer-motion";
import type { Session } from "next-auth";
import { useEffect } from "react";
import "@/styles/globals.css";
import { ThemeProvider } from "@/context/ThemeContext";

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
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV !== "production"
    ) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
    }
  }, []);

  return (
    <SessionProvider session={session}>
      <ThemeProvider>
        <LazyMotion features={domAnimation}>
          <Component {...pageProps} />
        </LazyMotion>
      </ThemeProvider>
    </SessionProvider>
  );
}
