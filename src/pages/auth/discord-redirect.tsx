// app/auth/discord-redirect/page.tsx
"use client"; // indispensable ici

import React, { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import Loading from "@/components/Loading";

const DiscordRedirectPage: React.FC = () => {
  const { status, data: session } = useSession();
  console.log("DiscordRedirectPage status:", status);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "authenticated" && !session?.user?.linked) {
      window.location.href = window.location.origin + "/link";
    } else if (status === "authenticated" && session?.user?.linked) {
      window.location.href = window.location.origin + "/close";
    } else {
      signIn("discord", {
        callbackUrl: window.location.origin + "/auth/discord-redirect",
      });
    }
  }, [status, session?.user?.linked]);

  return <Loading />;
};

export default DiscordRedirectPage;
