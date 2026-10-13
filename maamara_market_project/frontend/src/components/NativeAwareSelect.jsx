import React, { forwardRef, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { ChevronDown } from "lucide-react";
import "./NativeAwareSelect.css";

const normalizeOptions = (options) => options.map((option) => {
  if (typeof option === "string" || typeof option === "number") {
    return { value: String(option), label: String(option) };
  }
  return {
    value: String(option.value ?? ""),
    label: String(option.label ?? option.value ?? ""),
    disabled: Boolean(option.disabled),
  };
});

const NativeAwareSelect = forwardRef(function NativeAwareSelect({
  options = [],
  value,
  onChange,
  className = "",
  placeholder = "Select an option",
  disabled = false,
  name,
  id,
  required = false,
  onBlur,
  onFocus,
  "aria-label": ariaLabel,
  ...selectProps
}, forwardedRef) {
  const isNative = Capacitor.isNativePlatform();
  const normalizedOptions = normalizeOptions(options);
  const wrapperRef = useRef(null);
  const sourceRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});

  const setSourceRef = (node) => {
    sourceRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  const selected = normalizedOptions.find((option) => option.value === String(value ?? ""));
  const selectedLabel = selected?.label || placeholder;

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

  const openMenu = () => {
    if (disabled) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = Math.min(Math.max(rect.width, 288), viewportWidth - 16);
      const left = Math.max(8, Math.min(rect.left, viewportWidth - width - 8));
      const estimatedHeight = Math.min(Math.max(normalizedOptions.length * 44 + 12, 88), 320, viewportHeight - 24);
      const below = viewportHeight - rect.bottom - 8;
      const top = below >= Math.min(estimatedHeight, 180)
        ? rect.bottom + 8
        : Math.max(8, rect.top - estimatedHeight - 8);
      setMenuStyle({ left, top, width, maxHeight: Math.min(320, viewportHeight - top - 8) });
    }
    setOpen((previous) => !previous);
  };

  const chooseOption = (option) => {
    if (option.disabled) return;
    if (sourceRef.current) {
      sourceRef.current.value = option.value;
      sourceRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      onChange?.({ target: { name, value: option.value } });
    }
    setOpen(false);
    triggerRef.current?.focus();
  };

  const selectOptions = normalizedOptions.map((option, index) => (
    <option key={`${option.value}-${index}`} value={option.value} disabled={option.disabled}>
      {option.label}
    </option>
  ));

  if (!isNative) {
    return (
      <select
        {...selectProps}
        id={id}
        name={name}
        ref={forwardedRef}
        value={value ?? ""}
        onChange={onChange}
        onBlur={onBlur}
        onFocus={onFocus}
        aria-label={ariaLabel}
        required={required}
        disabled={disabled}
        className={className}
      >
        {selectOptions}
      </select>
    );
  }

  return (
    <div ref={wrapperRef} className="native-aware-select">
      <select
        {...selectProps}
        id={id}
        name={name}
        ref={setSourceRef}
        value={value ?? ""}
        onChange={onChange}
        onBlur={onBlur}
        onFocus={onFocus}
        aria-label={ariaLabel}
        required={required}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="native-aware-select__source"
      >
        {selectOptions}
      </select>
      <button
        ref={triggerRef}
        id={id ? `${id}-trigger` : undefined}
        type="button"
        className={`native-aware-select__trigger ${className}`}
        aria-label={ariaLabel || placeholder}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={openMenu}
      >
        <span className="native-aware-select__value">{selectedLabel}</span>
        <ChevronDown aria-hidden="true" className={`native-aware-select__chevron ${open ? "is-open" : ""}`} size={16} />
      </button>
      {open && (
        <div ref={menuRef} className="native-aware-select__menu" role="listbox" style={menuStyle}>
          {normalizedOptions.map((option, index) => (
            <button
              key={`${option.value}-${index}`}
              type="button"
              role="option"
              aria-selected={option.value === String(value ?? "")}
              disabled={option.disabled}
              className="native-aware-select__option"
              onClick={() => chooseOption(option)}
            >
              <span>{option.label || "\u00a0"}</span>
              {option.value === String(value ?? "") && <span aria-hidden="true" className="native-aware-select__check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default NativeAwareSelect;
