"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const [form, setForm] = useState({
    accessToken: "",
    refreshToken: "",
    discordId: "",
  });
  const [result, setResult] = useState<null | { success?: boolean; error?: string }>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/teste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setResult(data);
    } catch  {
      setResult({ error: "Erreur réseau" });
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return <div className="p-6">Chargement...</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Test NextAuth & Synchronize</h1>

      {session ? (
        <div className="mb-8">
          <p>
            Connecté en tant que{" "}
            <b>{session.user?.username ?? session.user?.email}</b>
          </p>
          <pre
            className="bg-gray-100 p-2 rounded text-xs mt-2"
            style={{ whiteSpace: "pre-wrap", maxWidth: 800 }}
          >
            {JSON.stringify(session, null, 2)}
          </pre>
          <button
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded"
            onClick={() => signOut()}
          >
            Se déconnecter
          </button>
        </div>
      ) : (
        <div className="mb-8">
          <p>Vous n'êtes pas connecté.</p>
          <button
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
            onClick={() => signIn()}
          >
            Se connecter
          </button>
        </div>
      )}

      <form
        className="bg-white shadow rounded p-4 mb-4"
        onSubmit={handleTest}
      >
        <h2 className="text-lg font-semibold mb-2">
          Test /api/teste (Synchronize)
        </h2>
        <div className="mb-2">
          <label className="block text-sm mb-1">Access Token</label>
          <input
            type="text"
            name="accessToken"
            value={form.accessToken}
            onChange={handleChange}
            className="w-full border rounded px-2 py-1"
            required
          />
        </div>
        <div className="mb-2">
          <label className="block text-sm mb-1">Refresh Token</label>
          <input
            type="text"
            name="refreshToken"
            value={form.refreshToken}
            onChange={handleChange}
            className="w-full border rounded px-2 py-1"
            required
          />
        </div>
        <div className="mb-2">
          <label className="block text-sm mb-1">Discord ID</label>
          <input
            type="text"
            name="discordId"
            value={form.discordId}
            onChange={handleChange}
            className="w-full border rounded px-2 py-1"
            required
          />
        </div>
        <button
          type="submit"
          className="mt-2 px-4 py-2 bg-green-600 text-white rounded"
          disabled={loading}
        >
          {loading ? "Test en cours..." : "Tester synchronize"}
        </button>
      </form>

      {result && (
        <div
          className={`p-3 rounded ${
            result.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {result.success ? "Synchronisation réussie !" : `Erreur : ${result.error}`}
        </div>
      )}
    </div>
  );
}

