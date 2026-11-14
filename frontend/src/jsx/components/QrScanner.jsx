import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

// Live camera QR scanner. Calls onScan(text) once with the first QR code it sees.
// Uses the back camera on phones. The camera only works on https:// pages
// (or http://localhost), which browsers require for privacy.
export default function QrScanner({ onScan }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [problem, setProblem] = useState("");
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let stream = null;
    let frame = null;
    let lastCheck = 0;
    let done = false;

    function scan(now) {
      frame = requestAnimationFrame(scan);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2 || now - lastCheck < 200) return; // ~5 checks a second
      lastCheck = now;
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) return;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, width, height);
      const code = jsQR(ctx.getImageData(0, 0, width, height).data, width, height, { inversionAttempts: "dontInvert" });
      if (code?.data && !done) {
        done = true;
        cancelAnimationFrame(frame);
        navigator.vibrate?.(80);
        onScan(code.data);
      }
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setProblem(window.isSecureContext
          ? "This browser can't use the camera."
          : "The camera only works on a secure (https) page.");
        setStarting(false);
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setStarting(false);
        frame = requestAnimationFrame(scan);
      } catch (err) {
        setStarting(false);
        setProblem(err?.name === "NotAllowedError"
          ? "Camera access was blocked. Allow camera access for this site in your browser settings, then reload."
          : "Couldn't start the camera. Close other apps using it and reload.");
      }
    }

    start();
    return () => {
      done = true;
      if (frame) cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop()); // turn the camera off when leaving
    };
  }, [onScan]);

  if (problem) {
    return (
      <div className="ci-scan-problem" role="alert">
        <p>{problem}</p>
        <p className="ci-hint">You can still check in by pointing your phone's camera app at the instructor's QR code.</p>
      </div>
    );
  }

  return (
    <div className="ci-scanner">
      <video ref={videoRef} muted playsInline aria-label="Camera view for scanning the check-in code" />
      <span className="ci-frame" aria-hidden="true" />
      {starting && <p className="ci-scan-status" role="status">Starting camera…</p>}
      <canvas ref={canvasRef} hidden />
    </div>
  );
}
