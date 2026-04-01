"use client";

import { useState, useEffect } from "react";
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
} from "@/components";
import { getNextUserCode, addMember, checkUsername, getSessionMemberId } from "@/services/user.service";
import { useDebouncedCallback } from "@/hooks/useDebounce";

export default function AddPlayerPage() {
  const [username, setUsername] = useState("");
  const [userCode, setUserCode] = useState("");
  const [parentId, setParentId] = useState("");
  const [type, setType] = useState("player");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  useEffect(() => {
    const id = getSessionMemberId();
    if (id) setParentId(id);
  }, []);

  const doCheckUsername = useDebouncedCallback(
    ((value: string) => {
      if (!value.trim()) {
        setUsernameStatus("idle");
        return;
      }
      setUsernameStatus("checking");
      checkUsername(value.trim())
        .then((res) => {
          setUsernameStatus(res.available ? "available" : "taken");
        })
        .catch(() => setUsernameStatus("idle"));
    }) as (...args: unknown[]) => void,
    400
  );

  useEffect(() => {
    if (!parentId.trim()) {
      setUserCode("");
      return;
    }
    getNextUserCode(parentId)
      .then((code) => setUserCode(code))
      .catch(() => setUserCode(""));
  }, [parentId]);

  useEffect(() => {
    doCheckUsername(username);
  }, [username, doCheckUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setMessage({ type: "error", text: "Username is required." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await addMember({
        username: username.trim(),
        userCode: userCode.trim() || undefined,
        parentId: parentId.trim() || getSessionMemberId() || "",
        type,
      });
      setMessage({ type: "success", text: "Player added successfully." });
      setUsername("");
      getNextUserCode(parentId).then((code) => setUserCode(code));
    } catch {
      // Global mutation toast handles API errors.
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-w-0">
      <PageHeader
        title="Add Player"
        breadcrumbs={["Players", "Add"]}
      />
      <Card title="New member" className="max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Input
              label="Username"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            {usernameStatus === "checking" && (
              <p className="mt-1 text-xs text-muted">Checking…</p>
            )}
            {usernameStatus === "available" && (
              <p className="mt-1 text-xs text-success">Username available.</p>
            )}
            {usernameStatus === "taken" && (
              <p className="mt-1 text-xs text-error">Username already taken.</p>
            )}
          </div>
          <Input
            label="User code"
            placeholder="Auto from parent"
            value={userCode}
            onChange={(e) => setUserCode(e.target.value)}
          />
          <Input
            label="Parent ID"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          />
          <Select
            label="Type"
            options={[
              { value: "player", label: "Player" },
              { value: "agent", label: "Agent" },
            ]}
            value={type}
            onChange={(e) => setType(e.target.value)}
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
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Adding…" : "Add member"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
