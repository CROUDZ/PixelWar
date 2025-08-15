import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { useSession, signOut } from "next-auth/react";
import { openInPopup } from "@/lib/utils";

const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { data: session, status } = useSession();
  console.log("Session data:", session);

  return (
    <header
      className={`flex items-center justify-between px-6 py-4 ${
        theme === "dark"
          ? "bg-gray-900 text-white"
          : "bg-gray-100 text-gray-900"
      }`}
    >
      <h1 className="text-2xl font-bold">PixelWar</h1>
      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="rounded-full p-2 transition-colors hover:bg-gray-200 dark:hover:bg-gray-800"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? "🌙" : "☀️"}
        </button>
        {status === "loading" ? (
          <span>Loading...</span>
        ) : session ? (
          <>
            <span className="font-medium">{session.user?.name}</span>
            <button
              onClick={() => signOut()}
              className="px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              Déconnexion
            </button>
          </>
        ) : (
          <button
            onClick={() =>
              openInPopup("http://localhost:3000/auth/discord-redirect")
            }
            className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            Connexion
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
