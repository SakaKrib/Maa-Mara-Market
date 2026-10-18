import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

const BrandSelect = ({ value, onChange, options = [], ariaLabel, className = "" }) => {
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});

  const selected = options.find((option) => String(option.value) === String(value ?? ""));
  const selectedLabel = selected?.label || options[0]?.label || "Select an option";

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const toggleMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = Math.min(Math.max(rect.width, 220), viewportWidth - 16);
      const left = Math.max(8, Math.min(rect.left, viewportWidth - width - 8));
      const estimatedHeight = Math.min(Math.max(options.length * 42 + 12, 84), 320, viewportHeight - 24);
      const below = viewportHeight - rect.bottom - 8;
      const top = below >= Math.min(estimatedHeight, 180)
        ? rect.bottom + 8
        : Math.max(8, rect.top - estimatedHeight - 8);
      setMenuStyle({ left, top, width, maxHeight: Math.min(320, viewportHeight - top - 8) });
    }
    setOpen((current) => !current);
  };

  const choose = (option) => {
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className={`relative min-w-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        className="flex min-h-[46px] w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3 text-left text-sm text-gray-800 shadow-sm outline-none transition hover:border-gray-300 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggleMenu}
      >
        <span className="min-w-0 truncate">{selectedLabel}</span>
        <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          ref={menuRef}
          role="listbox"
          aria-label={ariaLabel}
          className="fixed z-[20000] overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 text-gray-800 shadow-xl"
          style={menuStyle}
        >
          {options.map((option) => (
            <button
              key={String(option.value)}
              type="button"
              role="option"
              aria-selected={String(option.value) === String(value ?? "")}
              className={`flex min-h-[40px] w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-gray-50 focus:bg-gray-50 focus:outline-none ${String(option.value) === String(value ?? "") ? "bg-gray-100 font-semibold" : ""}`}
              onClick={() => choose(option)}
            >
              <span>{option.label}</span>
              {String(option.value) === String(value ?? "") && <span aria-hidden="true" className="font-bold text-gray-700">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default BrandSelect;
