import React from "react";
import Link from "next/link";

const Footer: React.FC = () => {
  return (
    <footer className="relative z-10 mt-16 py-8 bg-surface-primary border-t border-border-primary">
      <div className="max-w-4xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border-primary to-transparent mb-6"></div>

        <div className="text-center space-y-4">
          <p className="text-sm text-text-secondary">
            Créé avec ❤️ pour la communauté
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm">
            <span className="text-text-primary font-semibold">
              PixelWar 2025
            </span>
            <span className="hidden sm:block text-text-muted">•</span>
            <span className="text-text-secondary">
              Développé par{" "}
              <Link
                href="https://giovweb.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-800 hover:text-accent-hover font-semibold transition-colors duration-200 underline decoration-transparent hover:decoration-current"
              >
                Giovanni
              </Link>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
