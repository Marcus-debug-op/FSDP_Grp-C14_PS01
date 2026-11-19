import { useEffect, useId, useRef, useState } from "react";
import "../../css/dropdown.css";

// A select box whose list always opens downwards. A normal <select> lets the
// browser decide, so near the bottom of the screen it flips upwards and covers
// the page. This one always drops below the box and scrolls the page a little
// if needed so the whole list can be seen.
//
// Props: label, value, options [{ value, label }], onChange(value).
// Keyboard: arrows, Home/End, Enter or Space to choose, Esc to close, and
// typing letters jumps to the first matching option.
export default function Dropdown({ label, value, options, onChange, className = "" }) {
  const id = useId();
  const labelId = `${id}-label`;
  const buttonId = `${id}-button`;
  const listId = `${id}-list`;
  const optionId = (i) => `${id}-option-${i}`;

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const typed = useRef({ text: "", timer: null });

  const selectedIndex = Math.max(0, options.findIndex((o) => String(o.value) === String(value)));
  const selected = options[selectedIndex];

  function openList(index = selectedIndex) {
    setActive(index);
    setOpen(true);
  }

  function closeList(focusButton = true) {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  }

  function choose(index) {
    const option = options[index];
    if (option && String(option.value) !== String(value)) onChange(option.value);
    closeList();
  }

  // When the list opens: focus it, show the chosen option, and scroll the page
  // just enough for the list to fit below the box.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    list.focus({ preventScroll: true });
    const option = list.querySelector('[aria-selected="true"]');
    if (option) list.scrollTop = option.offsetTop - list.clientHeight / 2 + option.offsetHeight / 2;
    const bottom = list.getBoundingClientRect().bottom;
    if (bottom > window.innerHeight) window.scrollBy({ top: bottom - window.innerHeight + 16 });
  }, [open]);

  // Keep the highlighted option visible while moving with the keyboard.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const option = list.querySelector(`#${CSS.escape(optionId(active))}`);
    if (!option) return;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
    }
  }, [active, open]);

  // Clicking anywhere else closes the list.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (!wrapRef.current.contains(e.target)) closeList(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  useEffect(() => () => clearTimeout(typed.current.timer), []);

  // Typing letters jumps to the next option that starts with them.
  function typeAhead(key) {
    const t = typed.current;
    clearTimeout(t.timer);
    t.text += key.toLowerCase();
    t.timer = setTimeout(() => { t.text = ""; }, 600);
    const start = t.text.length === 1 ? active + 1 : active;
    for (let n = 0; n < options.length; n++) {
      const i = (start + n) % options.length;
      if (options[i].label.toLowerCase().startsWith(t.text)) return i;
    }
    return null;
  }

  function onButtonKeyDown(e) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      openList();
    }
  }

  function onListKeyDown(e) {
    const last = options.length - 1;
    const page = 8;
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); setActive((i) => Math.min(last, i + 1)); break;
      case "ArrowUp": e.preventDefault(); setActive((i) => Math.max(0, i - 1)); break;
      case "PageDown": e.preventDefault(); setActive((i) => Math.min(last, i + page)); break;
      case "PageUp": e.preventDefault(); setActive((i) => Math.max(0, i - page)); break;
      case "Home": e.preventDefault(); setActive(0); break;
      case "End": e.preventDefault(); setActive(last); break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Escape": e.preventDefault(); closeList(); break;
      case "Tab": closeList(false); break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const match = typeAhead(e.key);
          if (match !== null) setActive(match);
        }
    }
  }

  return (
    <div className={`dd-field ${className}`} ref={wrapRef}>
      <span id={labelId} className="dd-label">{label}</span>
      <button
        type="button"
        id={buttonId}
        ref={buttonRef}
        className={`dd-button${open ? " is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${labelId} ${buttonId}`}
        onClick={() => (open ? closeList() : openList())}
        onKeyDown={onButtonKeyDown}
      >
        <span className="dd-value">{selected?.label}</span>
        <span className="dd-arrow" aria-hidden="true" />
      </button>
      {open && (
        <ul
          id={listId}
          ref={listRef}
          className="dd-list"
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelId}
          aria-activedescendant={optionId(active)}
          onKeyDown={onListKeyDown}
        >
          {options.map((o, i) => (
            <li
              key={`${o.value}`}
              id={optionId(i)}
              role="option"
              aria-selected={i === selectedIndex}
              className={`dd-option${i === active ? " is-active" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseMove={() => i !== active && setActive(i)}
              onClick={() => choose(i)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
