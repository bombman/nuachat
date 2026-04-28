import { useRef, useState } from "react";

type Props = {
  value: string;
  options: string[];
  onChange: (v: string) => void;
};

export default function Dropdown({ value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      className="relative"
      ref={ref}
      onClick={(e) => e.stopPropagation()} 
    >
      {/* Trigger */}
      <div
        onClick={() => setOpen((o) => !o)}
        className="
          w-full px-3 py-2
          bg-neutral-800 border border-neutral-700
          rounded-lg cursor-pointer
          flex justify-between items-center
          hover:bg-neutral-700
          text-sm
        "
      >
        <span className="truncate">{value}</span>
        <span className={`text-xs opacity-60 transition ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </div>

      {/* Menu */}
      {open && (
          <div className="
            absolute z-[999]
            mt-1 w-full
            max-h-40          /* 🔥 จำกัดความสูง */
            overflow-y-auto   /* 🔥 scroll ได้ */
            rounded-lg border border-neutral-700
            bg-neutral-900
            shadow-xl
          ">
          {options.map((opt) => {
            const active = opt === value;

            return (
              <div
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`
                  px-3 py-2 cursor-pointer text-sm
                  ${active ? "bg-neutral-700 text-white" : "hover:bg-neutral-800"}
                `}
              >
                {opt}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}