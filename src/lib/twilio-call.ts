import { useCallback, useEffect, useRef, useState } from "react";

export type CallStatus = "idle" | "connecting" | "ringing" | "in-call" | "ended" | "error";

type DeviceLike = {
  connect: (opts?: { params?: Record<string, string> }) => Promise<CallLike>;
  destroy: () => void;
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
};

type CallLike = {
  disconnect: () => void;
  mute: (m: boolean) => void;
  isMuted?: () => boolean;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
};

export function useTwilioCall() {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);

  const deviceRef = useRef<DeviceLike | null>(null);
  const callRef = useRef<CallLike | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startedAtRef.current = null;
  };

  const cleanup = useCallback(() => {
    try {
      callRef.current?.disconnect();
    } catch {
      /* noop */
    }
    try {
      deviceRef.current?.destroy();
    } catch {
      /* noop */
    }
    callRef.current = null;
    deviceRef.current = null;
    clearTimer();
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    setError(null);
    setDuration(0);
    setIsMuted(false);
    setStatus("connecting");

    try {
      // Request mic first for a clean permission prompt.
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const res = await fetch("/api/public/twilio-token", { method: "POST" });
      if (!res.ok) throw new Error("token_failed");
      const { token } = (await res.json()) as { token?: string };
      if (!token) throw new Error("no_token");

      const { Device } = await import("@twilio/voice-sdk");
      const device = new Device(token, {
        logLevel: "silent",
        codecPreferences: ["opus", "pcmu"] as never,
      }) as unknown as DeviceLike;
      deviceRef.current = device;

      const call = (await device.connect({ params: {} })) as unknown as CallLike;
      callRef.current = call;

      call.on("ringing", () => setStatus("ringing"));
      call.on("accept", () => {
        setStatus("in-call");
        startedAtRef.current = Date.now();
        timerRef.current = setInterval(() => {
          if (startedAtRef.current) {
            setDuration(Math.floor((Date.now() - startedAtRef.current) / 1000));
          }
        }, 500);
      });
      call.on("disconnect", () => {
        setStatus("ended");
        clearTimer();
      });
      call.on("cancel", () => {
        setStatus("ended");
        clearTimer();
      });
      call.on("error", (e: unknown) => {
        console.error("Twilio call error", e);
        setError("call_error");
        setStatus("error");
        clearTimer();
      });
    } catch (err) {
      console.error("Twilio start error", err);
      const msg =
        err instanceof Error && err.name === "NotAllowedError"
          ? "mic_blocked"
          : "start_failed";
      setError(msg);
      setStatus("error");
      cleanup();
    }
  }, [cleanup]);

  const hangup = useCallback(() => {
    cleanup();
    setStatus("ended");
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    const call = callRef.current;
    if (!call) return;
    const next = !isMuted;
    try {
      call.mute(next);
      setIsMuted(next);
    } catch (e) {
      console.warn("mute failed", e);
    }
  }, [isMuted]);

  return { status, error, isMuted, duration, start, hangup, toggleMute };
}

export function formatDuration(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
