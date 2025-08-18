import React from "react";

interface BannedProps {
  reason: string;
  duration: string;
}

const Banned: React.FC<BannedProps> = ({ reason, duration }) => {
  return (
    <div style={{ textAlign: "center", padding: "20px", color: "red" }}>
      <h1>Access Denied</h1>
      <p>You have been banned from this platform.</p>
      <p>
        <strong>Reason:</strong> {reason}
      </p>
      <p>
        <strong>Duration:</strong> {duration}
      </p>
    </div>
  );
};

export default Banned;
