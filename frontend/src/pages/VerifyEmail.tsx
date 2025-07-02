import { config } from "@/config";
import { useEffect, useState } from "react";

const VerifyEmail = () => {
  const [message, setMessage] = useState("Verifying...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const email = params.get("email");
    if (token && email) {
      fetch(
        `${config.BACKEND_URL}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`
      )
        .then((res) => res.json())
        .then((data) => setMessage(data.message || "Verification failed."))
        .catch(() => setMessage("Verification failed."));
    } else {
      setMessage("Invalid verification link.");
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded shadow text-center">
        <h1 className="text-2xl font-bold mb-4">Email Verification</h1>
        <p>{message}</p>
      </div>
    </div>
  );
};

export default VerifyEmail;