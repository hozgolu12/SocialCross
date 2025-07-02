import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { config } from "@/config";

const RedditSetup = () => {
  const [subreddit, setSubreddit] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { token } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await fetch(`${config.BACKEND_URL}/api/oauth/reddit/subreddit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subredditName: subreddit || "" }), // Always submit, even if blank
      });
      const data = await resp.json();
      if (resp.ok) {
        toast({ title: "Success", description: "Subreddit name saved!" });
        navigate("/accounts");
      } else {
        toast({ title: "Error", description: data.message || "Failed to save." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow">
        <h2 className="text-xl mb-4 font-bold">Enter your subreddit name (optional)</h2>
        <input
          type="text"
          value={subreddit}
          onChange={e => setSubreddit(e.target.value)}
          placeholder="e.g. mysubreddit"
          className="border p-2 rounded w-full mb-4"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          Save
        </button>
      </form>
    </div>
  );
};

export default RedditSetup;