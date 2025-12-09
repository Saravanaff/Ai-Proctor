import React, { useEffect } from "react";

const CandidatePage: React.FC = () => {
  // Enforce light theme
  useEffect(() => {
    document.body.style.background = "#f8fafc";
    document.body.style.minHeight = "100vh";
    return () => {
      document.body.style.background = "";
      document.body.style.minHeight = "";
    };
  }, []);

  return (
    <div>
      <h1>Candidate Dashboard</h1>
      <p>Coming soon...</p>
    </div>
  );
};

export default CandidatePage;
