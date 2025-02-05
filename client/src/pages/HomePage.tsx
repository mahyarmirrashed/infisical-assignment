import React, { useState } from "react";
import { Copy, Eye, EyeOff } from "lucide-react";
import { BACKEND_BASE_URL, FRONTEND_BASE_URL } from "./config";

import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";

interface CreateSecretPayload {
  content: string;
  expiration: {
    amount: number;
    value: "m" | "d" | "h";
  };
  password?: string;
}

const HomePage = () => {
  const [secret, setSecret] = useState("");
  const [expirationAmount, setExpirationAmount] = useState("5");
  const [expirationUnit, setExpirationUnit] = useState<"m" | "h" | "d">("m");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [shortlink, setShortlink] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [copyTooltipOpen, setCopyTooltipOpen] = useState(false);

  // Validate password fields
  const passwordMismatchError =
    (password || confirmPassword) && password !== confirmPassword
      ? "Passwords do not match!"
      : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setShortlink("");

    if (passwordMismatchError) {
      return;
    }

    setLoading(true);
    try {
      const payload: CreateSecretPayload = {
        content: secret,
        expiration: {
          amount: parseInt(expirationAmount, 10),
          value: expirationUnit,
        },
      };

      if (password.trim() !== "") {
        payload.password = password;
      }

      const response = await fetch(`${BACKEND_BASE_URL}/api/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "An error occurred");
      } else {
        setShortlink(data.shortlink);
      }
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`${FRONTEND_BASE_URL}/share/${shortlink}`);
    setCopyTooltipOpen(true);
    setTimeout(() => setCopyTooltipOpen(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#252a33] flex flex-col justify-center items-center text-[#d8dee9] p-4 relative">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <h2 className="text-2xl font-bold text-center text-[#81a1c1]">
          Create Secret
        </h2>

        {/* Secret textarea */}
        <div>
          <Textarea
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Enter your secret..."
            rows={4}
            required
            className="bg-gray-700"
          />
        </div>

        {/* Expiration inputs */}
        <div className="flex space-x-2">
          <Input
            type="number"
            min="1"
            value={expirationAmount}
            onChange={(e) => setExpirationAmount(e.target.value)}
            placeholder="Amount"
            required
            className="bg-gray-700"
          />
          {/* For select, you can either wrap a native select or build a shadcn component */}
          <Select
            value={expirationUnit}
            onValueChange={(value) =>
              setExpirationUnit(value as "m" | "h" | "d")
            }
          >
            <SelectTrigger className="bg-gray-700">
              <SelectValue placeholder="Select time unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="m">Minutes</SelectItem>
              <SelectItem value="h">Hours</SelectItem>
              <SelectItem value="d">Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Password field */}
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Optional password"
            className="w-full bg-gray-700"
          />
          <div
            className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </div>
        </div>

        {/* Confirm Password field */}
        <div className="relative">
          <Input
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            className="w-full bg-gray-700"
          />
          <div
            className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
          >
            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </div>
        </div>

        {/* Inline error for password mismatch */}
        {passwordMismatchError && (
          <p className="text-[#bf616a] text-center mt-2 font-bold">
            {passwordMismatchError}
          </p>
        )}

        {/* Global error for other issues */}
        {error && <div className="text-[#bf616a] text-center">{error}</div>}

        {/* Submit button */}
        <Button
          disabled={loading}
          className="w-full bg-[#81a1c1] hover:bg-[#5e81ac] py-3 rounded font-bold"
        >
          {loading ? "Creating..." : "Create Secret"}
        </Button>

        {/* Display shortlink and copy functionality */}
        {shortlink && (
          <Card className="flex items-center space-x-2 pl-3 bg-gray-700 text-[#d8dee9] rounded justify-between">
            <span className="break-all">
              {FRONTEND_BASE_URL}/share/{shortlink}
            </span>
            <TooltipProvider>
              <Tooltip open={copyTooltipOpen}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    onClick={copyToClipboard}
                    className="bg-[#81a1c1] hover:bg-[#5e81ac] p-2 rounded-sm rounded-l-none"
                  >
                    <Copy size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copied!</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Card>
        )}
      </form>

      {/* Bottom-left logo */}
      <Logo />
    </div>
  );
};

export default HomePage;
