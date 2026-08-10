import { useCallback, useEffect, useRef, useState } from "react";

export type CallStatus = "idle" | "connecting" | "ringing" | "in-call" | "ended" | "error";

type TwilioDeviceCtor = new (token: string, opts?: Record<string, unknown>) => unknown;

let sdkPromise: Promise<TwilioDeviceCtor> | null = null;

/**
 * Loads Twilio's prebuilt browser bundle from /vendor.
 * The npm ESM build breaks in the browser bundle (extends an undefined
 * EventEmitter), so we use the official self-contained dist file instead.
 */
function loadTwilioDevice(): Promise<TwilioDeviceCtor> {
  const w = window as unknown as { Twilio?: { Device?: TwilioDeviceCtor } };
  if (w.Twilio?.Device) return Promise.resolve(w.Twilio.Device);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<TwilioDeviceCtor>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/vendor/twilio-voice.min.js";
    script.async = true;
    script.onload = () => {
      const D = (window as unknown as { Twilio?: { Device?: TwilioDeviceCtor } }).Twilio?.Device;
      if (D) resolve(D);
      else reject(new Error("sdk_missing"));
    };
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error("sdk_load_failed"));
    };
    document.head.appendChild(script);
  });

  return sdkPromise;
}

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
  const micStreamRef = useRef<MediaStream | null>(null);

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
    try {
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      /* noop */
    }
    micStreamRef.current = null;
    callRef.current = null;
    deviceRef.current = null;
    clearTimer();
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(() => {
    // CRITICAL for iOS Safari / mobile Chrome: start getUserMedia in the same
    // synchronous turn as the tap. Any React setState before this call drops
    // the user-gesture flag and the permission prompt never appears.
    const canCapture =
      typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
    // Mobile browsers silently refuse mic access outside a secure context
    // (http:// or an iframe without allow="microphone") — no prompt is shown.
    const secure = typeof window === "undefined" || window.isSecureContext !== false;

    const micPromise = !canCapture
      ? Promise.reject(
          Object.assign(new Error("Microphone API unavailable"), {
            name: secure ? "NotSupportedError" : "SecurityError",
          }),
        )
      : navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

    void (async () => {
      setError(null);
      setDuration(0);
      setIsMuted(false);
      setStatus("connecting");

      try {
        // Keep the granted stream alive: releasing it here makes iOS Safari
        // re-request permission from a non-gesture context, which fails silently.
        micStreamRef.current = await micPromise;


        const res = await fetch("/api/public/twilio-token", { method: "POST" });
        if (!res.ok) throw new Error("token_failed");
        const { token } = (await res.json()) as { token?: string };
        if (!token) throw new Error("no_token");

        const Device = await loadTwilioDevice();
        const device = new Device(token, {
          logLevel: "silent",
          codecPreferences: ["opus", "pcmu"] as never,
        }) as unknown as DeviceLike;
        deviceRef.current = device;

        device.on?.("error", (e: unknown) => {
          console.error("Twilio device error", e);
        });

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
        const name = err instanceof Error ? err.name : "";
        const msg =
          name === "NotAllowedError" || name === "PermissionDeniedError"
            ? "mic_blocked"
            : name === "NotSupportedError" || name === "NotFoundError"
              ? "mic_unsupported"
              : "start_failed";
        setError(msg);
        setStatus("error");
        cleanup();
      }
    })();
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
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
