"use client";

import { useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Input,
} from "@/components";
import { deposit } from "@/services/account.service";
import { timestampMs } from "@/utils/date";

export default function DepositPage() {
  const [userId, setUserId] = useState("");
  const [chips, setChips] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const chipsNum = parseFloat(chips);
    if (!userId.trim() || Number.isNaN(chipsNum) || chipsNum <= 0) {
      setMessage({ type: "error", text: "Enter a valid User ID and chips amount." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await deposit({
        isTransfer: false,
        chips: chipsNum,
        userId: userId.trim(),
        dwType: "D",
        comment: comment.trim() || undefined,
        timestamp: timestampMs(),
      });
      setMessage({ type: "success", text: "Deposit submitted successfully." });
      setChips("");
      setComment("");
    } catch {
      setMessage({ type: "error", text: "Deposit failed. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-w-0">
      <PageHeader
        title="Auto Deposit"
        breadcrumbs={["Transactions", "Auto"]}
      />

      <Card title="Deposit chips (POST /account/in)" className="max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="User ID"
            placeholder="Enter user ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
          />
          <Input
            label="Chips"
            type="number"
            step="any"
            min="0"
            placeholder="0.00"
            value={chips}
            onChange={(e) => setChips(e.target.value)}
            required
          />
          <Input
            label="Comment (optional)"
            placeholder="Comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          {message && (
            <p
              className={`text-sm ${
                message.type === "success" ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {message.text}
            </p>
          )}
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
          >
            {loading ? "Submitting…" : "Deposit"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
