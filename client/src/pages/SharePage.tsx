import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { Copy, Eye, EyeOff } from "lucide-react";
import { BACKEND_BASE_URL } from "./config";

import Logo from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SharePage = () => {
  const { shortId } = useParams<{ shortId: string }>();
  const [secret, setSecret] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [error, setError] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [passwordInputType, setPasswordInputType] = useState("password");
  const [copyTooltipOpen, setCopyTooltipOpen] = useState(false);

  useEffect(() => {
    if (!shortId) return;
    const fetchSecret = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${BACKEND_BASE_URL}/api/share/${shortId}`);
        if (res.ok) {
          const data = await res.json();
          setSecret(data.content);
          setRequiresPassword(false);
        } else if (res.status === 401) {
          // 401 means the secret is password protected
          setRequiresPassword(true);
        } else {
          const data = await res.json();
          setError(data.message || "An error occurred");
        }
      } catch {
        setError("An error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchSecret();
  }, [shortId]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/share/${shortId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const data = await res.json();
        setSecret(data.content);
        setRequiresPassword(false);
      } else {
        const data = await res.json();
        setError(data.message || "Incorrect password");
      }
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(secret);
    setCopyTooltipOpen(true);
    setTimeout(() => setCopyTooltipOpen(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#252a33] flex flex-col justify-center items-center text-white p-4 relative">
      {requiresPassword ? (
        /* Unauthenticated view */
        <form
          onSubmit={handlePasswordSubmit}
          className="w-full max-w-md space-y-4"
        >
          <h2 className="text-2xl font-bold text-center text-[#81a1c1]">
            Enter Password
          </h2>
          <div>
            <div className="relative">
              <Input
                type={passwordInputType}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="bg-gray-700"
              />
              <div
                className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
                onClick={() =>
                  setPasswordInputType(
                    passwordInputType === "password" ? "text" : "password",
                  )
                }
              >
                {passwordInputType === "password" ? (
                  <Eye size={20} />
                ) : (
                  <EyeOff size={20} />
                )}
              </div>
            </div>

            {error && (
              <div className="text-[#bf616a] text-center mt-2 font-bold">
                {error}
              </div>
            )}
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="bg-[#81a1c1] hover:bg-[#5e81ac] rounded py-3 w-full font-bold"
          >
            {loading ? "Verifying..." : "Submit"}
          </Button>
        </form>
      ) : (
        /* Authenticated view */
        <div className="w-full max-w-md space-y-4">
          <h2 className="text-2xl font-bold text-center text-[#81a1c1]">
            Your Secret
          </h2>

          {/* Secret showing area */}
          <div className="relative">
            <Input
              type={showSecret ? "text" : "password"}
              value={secret}
              placeholder="Amount"
              readOnly
              className="bg-gray-700"
            />
            <div
              className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
              onClick={() => setShowSecret((prev) => !prev)}
            >
              {showSecret ? <EyeOff size={20} /> : <Eye size={20} />}
            </div>
          </div>

          <TooltipProvider>
            <Tooltip open={copyTooltipOpen}>
              <TooltipTrigger asChild>
                <Button
                  disabled={loading}
                  onClick={copyToClipboard}
                  className="w-full bg-[#81a1c1] hover:bg-[#5e81ac] py-3 rounded font-bold"
                >
                  <Copy size={20} />
                  <span>Copy Secret</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copied!</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Bottom-left logo */}
      <Logo />
    </div>
  );
};

export default SharePage;
