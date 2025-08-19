import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="relative z-10 mt-16 py-8 text-center text-gray-600 dark:text-gray-400">
      <div className="max-w-4xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent mb-6"></div>
        <p className="text-sm">
          Créé avec ❤️ pour la communauté •
          <span className="ml-2 text-gradient font-semibold">
            PixelWar 2025
          </span>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
