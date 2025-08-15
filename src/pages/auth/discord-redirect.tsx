// app/auth/discord-redirect/page.tsx
"use client"; // indispensable ici

import React, { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import Loading from "@/components/Loading";

const DiscordRedirectPage: React.FC = () => {
  const { status } = useSession();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "authenticated") {
      window.location.href = window.location.origin + "/closePage";
    } else {
      signIn("discord", {
        callbackUrl: window.location.origin + "/auth/discord-redirect",
      });
    }
  }, [status]);

  return <Loading />;
};

export default DiscordRedirectPage;
