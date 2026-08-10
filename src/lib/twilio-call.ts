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

type TwilioCallError = {
  code?: number;
  message?: string;
  originalError?: {
    code?: number;
    message?: string;
  };
};

function describeTwilioError(error: unknown) {
  const twilioError = error as TwilioCallError;
  const providerError = twilioError.originalError;
  const code = providerError?.code ?? twilioError.code;
  const message = providerError?.message ?? twilioError.message ?? String(error);

  if (code === 13225) {
    return "13225 Outbound dial blocked by Twilio (blacklist / Trust Hub). Browser calls must Connect to the voice agent stream — not Dial the phone number.";
  }

  if (code === 31005) {
    return "31005 Connection hung up by Twilio gateway. Usually means the voice agent webhook/stream is down, or an outbound Dial was blocked. Set PIPECAT_STREAM_URL and keep the Pipecat bot online.";
  }

  return `${code ?? ""} ${message}`.trim();
}

function summarizeTwiml(body: string) {
  const stream = /<Stream[^>]*\surl=["']([^"']+)["']/i.exec(body)?.[1];
  if (stream) {
    let host = stream;
    try {
      host = new URL(stream).host;
    } catch {
      /* keep raw */
    }
    return { ok: true, detail: `HTTP 200 · Connect/Stream → ${host}`, streamUrl: stream };
  }

  const redirect = /<Redirect[^>]*>([^<]+)<\/Redirect>/i.exec(body)?.[1]?.trim();
  if (redirect) {
    return { ok: true, detail: `HTTP 200 · Redirect → ${redirect}`, streamUrl: null as string | null };
  }

  const dialNumber = /<Number[^>]*>([^<]+)<\/Number>/i.exec(body)?.[1]?.trim();
  if (dialNumber) {
    return {
      ok: false,
      detail: `HTTP 200 · Dial ${dialNumber} (blocked path — set PIPECAT_STREAM_URL)`,
      streamUrl: null as string | null,
    };
  }

  if (/<Say/i.test(body)) {
    return {
      ok: false,
      detail: `HTTP 200 · agent not configured — set PIPECAT_STREAM_URL=wss://…/ws`,
      streamUrl: null as string | null,
    };
  }

  if (/<Response/i.test(body)) {
    return { ok: true, detail: "HTTP 200 · TwiML ok", streamUrl: null as string | null };
  }

  return {
    ok: false,
    detail: `HTTP 200 but no TwiML: ${body.slice(0, 100)}`,
    streamUrl: null as string | null,
  };
}

export type DiagState = "pending" | "ok" | "fail" | "info";

export type DiagStep = {
  id: string;
  label: string;
  state: DiagState;
  detail?: string;
  at: number;
};

export function useTwilioCall() {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [steps, setSteps] = useState<DiagStep[]>([]);

  const pushStep = useCallback((step: Omit<DiagStep, "at">) => {
    setSteps((prev) => {
      const next = prev.filter((s) => s.id !== step.id);
      return [...next, { ...step, at: Date.now() }];
    });
  }, []);
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
    setSteps([]);

    try {
      // 1. Microphone permission
      pushStep({ id: "mic", label: "Microphone permission", state: "pending" });
      await navigator.mediaDevices.getUserMedia({ audio: true });
      pushStep({ id: "mic", label: "Microphone permission", state: "ok", detail: "granted" });

      // 2. Access token from our server
      pushStep({ id: "token", label: "Voice token (/api/public/twilio-token)", state: "pending" });
      const res = await fetch("/api/public/twilio-token", { method: "POST" });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        pushStep({
          id: "token",
          label: "Voice token (/api/public/twilio-token)",
          state: "fail",
          detail: `HTTP ${res.status} ${body.slice(0, 120)}`,
        });
        throw new Error("token_failed");
      }
      const { token } = (await res.json()) as { token?: string };
      if (!token) {
        pushStep({
          id: "token",
          label: "Voice token (/api/public/twilio-token)",
          state: "fail",
          detail: "no token in response",
        });
        throw new Error("no_token");
      }
      pushStep({
        id: "token",
        label: "Voice token (/api/public/twilio-token)",
        state: "ok",
        detail: `HTTP 200 · token ${token.length} chars`,
      });

      // 3. TwiML webhook reachability (what Twilio calls to route the call)
      pushStep({
        id: "webhook",
        label: "Call webhook (/api/public/twiml-voice)",
        state: "pending",
      });
      try {
        const hookRes = await fetch("/api/public/twiml-voice", { method: "POST" });
        const body = await hookRes.text();
        const summary = summarizeTwiml(body);
        pushStep({
          id: "webhook",
          label: "Call webhook (/api/public/twiml-voice)",
          state: hookRes.ok && summary.ok ? "ok" : "fail",
          detail: hookRes.ok ? summary.detail : `HTTP ${hookRes.status} ${body.slice(0, 100)}`,
        });
        pushStep({
          id: "bot-stream",
          label: "Bot stream",
          state: summary.streamUrl ? "ok" : summary.ok ? "info" : "fail",
          detail: summary.streamUrl
            ? `web stream → ${summary.streamUrl}`
            : summary.ok
              ? "Routed via Redirect/webhook (no direct Stream in probe)"
              : "No media stream configured — set PIPECAT_STREAM_URL in project secrets",
        });
      } catch (e) {
        pushStep({
          id: "webhook",
          label: "Call webhook (/api/public/twiml-voice)",
          state: "fail",
          detail: e instanceof Error ? e.message : "unreachable",
        });
      }

      // 4. Twilio browser SDK
      pushStep({ id: "sdk", label: "Twilio Voice SDK", state: "pending" });
      const Device = await loadTwilioDevice();
      pushStep({ id: "sdk", label: "Twilio Voice SDK", state: "ok", detail: "loaded" });

      pushStep({ id: "connect", label: "Twilio connection", state: "pending" });
      const device = new Device(token, {
        logLevel: "silent",
        codecPreferences: ["opus", "pcmu"] as never,
      }) as unknown as DeviceLike;
      deviceRef.current = device;

      device.on?.("error", (e: unknown) => {
        const err = e as { code?: number; message?: string };
        pushStep({
          id: "device-error",
          label: "Twilio device error",
          state: "fail",
          detail: `${err?.code ?? ""} ${err?.message ?? String(e)}`.trim(),
        });
      });

      const call = (await device.connect({ params: {} })) as unknown as CallLike;
      callRef.current = call;
      pushStep({ id: "connect", label: "Twilio connection", state: "ok", detail: "call created" });

      call.on("ringing", () => {
        setStatus("ringing");
        pushStep({
          id: "ringing",
          label: "Twilio ringing agent",
          state: "info",
          detail: "waiting for answer",
        });
      });
      call.on("accept", () => {
        setStatus("in-call");
        pushStep({ id: "answer", label: "Agent answered", state: "ok", detail: "audio connected" });
        startedAtRef.current = Date.now();
        timerRef.current = setInterval(() => {
          if (startedAtRef.current) {
            setDuration(Math.floor((Date.now() - startedAtRef.current) / 1000));
          }
        }, 500);
      });
      call.on("disconnect", () => {
        setStatus("ended");
        pushStep({ id: "end", label: "Call ended", state: "info", detail: "disconnected" });
        clearTimer();
      });
      call.on("cancel", () => {
        setStatus("ended");
        pushStep({
          id: "end",
          label: "Call ended",
          state: "info",
          detail: "cancelled before answer",
        });
        clearTimer();
      });
      call.on("error", (e: unknown) => {
        console.error("Twilio call error", e);
        pushStep({
          id: "call-error",
          label: "Twilio call error",
          state: "fail",
          detail: describeTwilioError(e),
        });
        setError("call_error");
        setStatus("error");
        clearTimer();
      });
    } catch (err) {
      console.error("Twilio start error", err);
      const raw = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      pushStep({ id: "fatal", label: "Startup failed", state: "fail", detail: raw });
      const msg =
        err instanceof Error && err.name === "NotAllowedError" ? "mic_blocked" : "start_failed";
      setError(msg);
      setStatus("error");
      cleanup();
    }
  }, [cleanup, pushStep]);

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

  return { status, error, isMuted, duration, steps, start, hangup, toggleMute };
}

export function formatDuration(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
