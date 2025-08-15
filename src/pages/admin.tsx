import React from "react";
import Link from "next/link";
import AdminPanel from "../components/AdminPanel";

const AdminPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Administration PixelWar
              </h1>
              <p className="text-sm text-gray-600">
                Gestion et surveillance du serveur
              </p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Retour au Jeu
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <AdminPanel serverUrl="http://localhost:3001" />
      </main>
    </div>
  );
};

export default AdminPage;
