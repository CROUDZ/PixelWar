import React, { useEffect } from "react";

const ClosePage: React.FC = () => {
  useEffect(() => {
    window.close();
  }, []);
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#f8f9fa",
      }}
    >
      <h1 style={{ color: "#333", fontFamily: "Arial, sans-serif" }}>
        Fermeture de la page...
      </h1>
    </div>
  );
};

export default ClosePage;
