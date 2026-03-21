import { useEffect, useRef, useState, useCallback } from "react";
import { TranslationResult } from "../types";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000";

type SessionStatus = "idle" | "active" | "paused" | "stopped";
type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

interface UseTranslationSocketReturn {
  connectionStatus: ConnectionStatus;
  sessionStatus: SessionStatus;
  latestResult: TranslationResult | null;
  sendFrame: (frameData: string) => void;
  startSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  stopSession: () => void;
}

export function useTranslationSocket(sessionId: string): UseTranslationSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("idle");
  const [latestResult, setLatestResult] = useState<TranslationResult | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus("connecting");
    const ws = new WebSocket(`${WS_URL}/ws/${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => setConnectionStatus("connected");

    ws.onmessage = (event) => {
      try {
        const result: TranslationResult = JSON.parse(event.data);
        setLatestResult(result);
        // Sync session status from backend result
        if (result.status === "paused") setSessionStatus("paused");
        else if (result.status === "active") setSessionStatus("active");
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => setConnectionStatus("error");

    ws.onclose = () => {
      setConnectionStatus("disconnected");
      wsRef.current = null;
    };
  }, [sessionId]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const send = useCallback((payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const sendFrame = useCallback((frameData: string) => {
    send({ type: "frame", sessionId, frameData, timestamp: Date.now() });
  }, [send, sessionId]);

  const startSession = useCallback(() => {
    connect();
    setSessionStatus("active");
  }, [connect]);

  const pauseSession = useCallback(() => {
    send({ type: "pause" });
    setSessionStatus("paused");
  }, [send]);

  const resumeSession = useCallback(() => {
    send({ type: "resume" });
    setSessionStatus("active");
  }, [send]);

  const stopSession = useCallback(() => {
    send({ type: "stop" });
    setSessionStatus("stopped");
    wsRef.current?.close();
  }, [send]);

  return {
    connectionStatus,
    sessionStatus,
    latestResult,
    sendFrame,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
  };
}
