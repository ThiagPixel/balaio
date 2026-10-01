"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { SelectOption } from "./select";

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

type SearchableSelectProps = {
  name: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
};

export function SearchableSelect({
  name, label, value, options, onChange, required, error,
}: SearchableSelectProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const selected = options.find((option) => option.value === value);
  const searchOptions = useMemo(() => options.map((option) => ({
    ...option, search: normalizeSearch(option.label),
  })), [options]);
  const filtered = useMemo(() => {
    const terms = normalizeSearch(query ?? "").trim().split(/\s+/).filter(Boolean);
    return searchOptions.filter((option) => terms.every((term) => option.search.includes(term)));
  }, [query, searchOptions]);

  useEffect(() => {
    inputRef.current?.setCustomValidity(
      !selected && (required || query) ? "Selecione um produto da lista." : "",
    );
  }, [selected, required, query]);

  useEffect(() => {
    if (open && activeIndex >= 0) {
      listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, open]);

  function choose(option: SelectOption) {
    onChange(option.value);
    setQuery(null);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.setCustomValidity("");
    inputRef.current?.focus();
  }

  return (
    <div className="relative w-full" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input type="hidden" name={name} value={selected?.value ?? ""} />
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open && activeIndex >= 0 && filtered[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        autoComplete="off"
        required={required}
        placeholder="Digite para buscar um produto..."
        value={query ?? selected?.label ?? ""}
        className={`block w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-slate-300 focus:border-brand-500 focus:ring-brand-500"}`}
        onFocus={(event) => {
          setOpen(true);
          event.currentTarget.select();
        }}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          onChange("");
          setActiveIndex(-1);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => {
              if (!filtered.length) return -1;
              if (event.key === "ArrowDown") return Math.min(index + 1, filtered.length - 1);
              return index <= 0 ? filtered.length - 1 : index - 1;
            });
          } else if (event.key === "Enter" && open) {
            event.preventDefault();
            const option = filtered[activeIndex >= 0 ? activeIndex : 0];
            if (option) choose(option);
          } else if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
            setActiveIndex(-1);
          }
        }}
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          <ul ref={listRef} id={`${id}-list`} role="listbox" aria-label={label} className="max-h-60 overflow-y-auto py-1">
            {filtered.map((option, index) => (
              <li
                key={option.value}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={option.value === value}
                className={`cursor-pointer px-3 py-2 text-sm ${index === activeIndex || option.value === value ? "bg-brand-50 text-brand-800" : "text-slate-900 hover:bg-slate-100"}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                {option.label}
              </li>
            ))}
          </ul>
          {filtered.length === 0 && (
            <p role="status" className="px-3 py-3 text-sm text-slate-500">Nenhum produto encontrado.</p>
          )}
        </div>
      )}
      {error && <p id={`${id}-error`} className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
