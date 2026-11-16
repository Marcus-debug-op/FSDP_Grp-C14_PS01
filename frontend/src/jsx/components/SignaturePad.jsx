import { useEffect, useRef, useState } from "react";

// FSDP-75: draw a signature with a mouse, finger or pen. onChange gets a PNG
// data URL after each stroke, or null once cleared. `initial` shows a saved
// signature (from a draft) so the examiner doesn't have to sign again.
export default function SignaturePad({ initial = null, onChange, disabled = false }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(!initial);

  // Size the canvas to its box (sharp on high-density screens) and draw the saved one.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#26231f";
    if (initial) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, width, height);
      img.src = initial;
    }
  }, [initial]);

  const point = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  function start(e) {
    if (disabled) return;
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = point(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1); // a tap leaves a dot
    ctx.stroke();
  }

  function move(e) {
    if (!drawing.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = point(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    setEmpty(false);
    onChange(canvasRef.current.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
    onChange(null);
  }

  return (
    <div className="signature">
      <canvas
        ref={canvasRef}
        className="signature-canvas"
        role="img"
        aria-label={empty ? "Signature box, empty" : "Signature box, signed"}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      />
      <div className="signature-foot">
        <span>{empty ? "Sign here with your mouse or finger" : "Signed"}</span>
        {!disabled && (
          <button type="button" className="approval-undo" onClick={clear} disabled={empty}>Clear</button>
        )}
      </div>
    </div>
  );
}
