import { useSession, signIn, signOut } from "next-auth/react";

export default function TestePage() {
  const { data: session } = useSession();

  if (!session) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h1>Bienvenue sur la page de test</h1>
        <p>Vous n'êtes pas connecté.</p>
        <button onClick={() => signIn()}>Se connecter</button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Bienvenue, {session.user?.name}!</h1>
      <p>Vous êtes connecté avec l'email : {session.user?.email}</p>
      <button onClick={() => signOut()}>Se déconnecter</button>
    </div>
  );
}
