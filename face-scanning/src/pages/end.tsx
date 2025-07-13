import { useEffect, useRef } from "react";

const EndPage = () => {
  const hasReloaded = useRef(false);

  useEffect(() => {
    // Only reload once
    if (!hasReloaded.current) {
      hasReloaded.current = true;
      window.location.reload();
    }
  }, []);

  return (
    <div style={{ textAlign: "center", paddingTop: "100px" }}>
      <h1>✅ Exam Submitted</h1>
      <p>thank you for participating</p>
    </div>
  );
};

export default EndPage;
