"use client";
import { useState } from "react";
import styles from "../styles/FaceScan.module.css";
import { useRouter } from "next/router";
export let gname:any;

export default function GetName() {
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const router = useRouter();

  const isValid = name.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    gname=name;
    if (isValid) {
      localStorage.setItem("userName", name.trim());
      router.push("/device");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.inside}>
      <h2 className={styles.heading}>Enter Your Name</h2>
      <form onSubmit={handleSubmit} style={{ width: "340px" }}>
        <label
          htmlFor="userName"
          style={{
            display: "block",
            marginBottom: "10px",
            fontWeight: 500,
            color: "#f2f2f2",
            fontSize: "16px",
            letterSpacing: "0.2px",
          }}
        >
          User Name
        </label>
        <input
          id="userName"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={() => setTouched(true)}
          className={styles.step}
          style={{
            width: "100%",
            fontSize: "15px",
            background: "#181818",
            color: "#e0e0e0",
            border: "1px solid #2a2a2a",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: touched && !isValid ? "6px" : "18px",
            outline: "none",
          }}
          placeholder="Enter your name"
        />
        {touched && !isValid && (
          <div style={{ color: "#f44336", fontSize: "13px", marginBottom: "10px" }}>
            Please enter your name.
          </div>
        )}
        <button
          type="submit"
          className={styles.nextButton}
          disabled={!isValid}
        >
          Next
        </button>
      </form>
      </div>
    </div>
  );
}