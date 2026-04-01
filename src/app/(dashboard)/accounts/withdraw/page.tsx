"use client";

import { useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Input,
} from "@/components";
import { withdraw } from "@/services/account.service";
import { timestampMs } from "@/utils/date";

export default function WithdrawPage() {
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
      await withdraw({
        isTransfer: false,
        chips: chipsNum,
        userId: userId.trim(),
        dwType: "W",
        comment: comment.trim() || undefined,
        timestamp: timestampMs(),
      });
      setMessage({ type: "success", text: "Withdrawal submitted successfully." });
      setChips("");
      setComment("");
    } catch {
      // Global mutation toast handles API errors.
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-w-0">
      <PageHeader
        title="Manual Withdraw"
        breadcrumbs={["Transactions", "Manual"]}
      />

      <Card title="Withdraw chips (POST /account/out)" className="max-w-lg">
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
                message.type === "success" ? "text-success" : "text-error"
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
            {loading ? "Submitting…" : "Withdraw"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
