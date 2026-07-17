"use client";

import { Suspense, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div style={styles.wrap} />}>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (res.ok) {
      router.push(params.get("from") || "/admin/seo");
    } else {
      setError("Incorrect password");
    }
  }

  return (
    <div style={styles.wrap}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h1 style={styles.title}>Admin</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          style={styles.input}
        />
        {error && <p style={styles.error}>{error}</p>}
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Checking..." : "Enter"}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#1a1410",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    background: "#241b14",
    border: "1px solid #3a2c1d",
    borderRadius: 12,
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  title: {
    color: "#e8b04b",
    fontFamily: "system-ui, sans-serif",
    fontSize: 20,
    margin: 0,
    marginBottom: 4,
  },
  input: {
    background: "#1a1410",
    border: "1px solid #3a2c1d",
    borderRadius: 8,
    padding: "10px 12px",
    color: "#f0e6d2",
    fontSize: 16,
  },
  error: {
    color: "#e07856",
    fontSize: 13,
    margin: 0,
  },
  button: {
    background: "#e8b04b",
    color: "#1a1410",
    border: "none",
    borderRadius: 8,
    padding: "10px 12px",
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
  },
};
