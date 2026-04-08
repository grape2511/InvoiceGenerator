"use client";

import { useState, useEffect } from "react";

interface Props {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
}

export default function NumericInput({ value, onChange, className, placeholder }: Props) {
  const [raw, setRaw] = useState(value ? String(value) : "");

  useEffect(() => {
    // Only sync from parent if the parsed raw doesn't match the value
    const parsed = parseFloat(raw);
    if (isNaN(parsed) && value === 0) return;
    if (parsed !== value) {
      setRaw(value ? String(value) : "");
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    // Allow empty, digits, and one decimal point
    if (text === "" || /^\d*\.?\d*$/.test(text)) {
      setRaw(text);
      const num = parseFloat(text);
      onChange(isNaN(num) ? 0 : num);
    }
  };

  const handleBlur = () => {
    // Clean up on blur (e.g. "41." -> "41")
    if (raw === "" || raw === ".") {
      setRaw("");
      return;
    }
    const num = parseFloat(raw);
    if (!isNaN(num)) {
      setRaw(String(num));
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={raw}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
      placeholder={placeholder}
    />
  );
}
