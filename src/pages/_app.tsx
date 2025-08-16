import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import type { Session } from "next-auth";
import { LazyMotion, domAnimation } from "framer-motion";
import "@/styles/globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import WSListener from "@/components/WSListener";

type AppPropsWithAuth = AppProps & {
  pageProps: {
    session?: Session;
  };
};

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppPropsWithAuth) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider>
        <LazyMotion features={domAnimation}>
          <WSListener />
          <Component {...pageProps} />
        </LazyMotion>
      </ThemeProvider>
    </SessionProvider>
  );
}
