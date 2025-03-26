import UpArrow from "@charm/static/icons/up-arrow.svg?react";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

interface Option {
  value: string;
  label: string;
  subLabel?: string;
  prefix?: React.ReactNode;
}

interface MenuSelectProps {
  options: Option[];
  placeholder?: string;
  label?: string;
  onChange?: (option: Option | null) => void;
}

const MenuSelect: React.FC<MenuSelectProps> = ({
  options,
  onChange,
  label,
  placeholder,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<Option | null>(
    options[0] ?? null,
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleSelectOption = (option: Option) => {
    setSelectedOption(option);
    onChange?.(option);
    toggleDropdown();
  };

  return (
    <div className="w-full">
      {label && (
        <div className="mb-2 flex justify-between">
          <p className="text-base font-semibold leading-6">{label}</p>
        </div>
      )}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={clsx(
            "relative flex w-full items-center justify-between gap-2 rounded-xl border border-opacityColor-10 p-3 text-base font-medium leading-6 disabled:cursor-not-allowed",
            !selectedOption && "text-other-placeholder",
          )}
        >
          {selectedOption ? (
            <div className="flex items-center gap-2">
              {selectedOption.prefix}
              {selectedOption.label}
            </div>
          ) : (
            (placeholder ?? "Select an option")
          )}
          <span
            className={clsx(
              "pointer-events-none flex items-center fill-opacityColor-70 transition-transform",
              !isOpen && "rotate-180",
            )}
          >
            <UpArrow />
          </span>
        </button>
        {isOpen && (
          <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-other-bg-1 py-2 dark:bg-other-bg-2">
            {options.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => handleSelectOption(option)}
                className={clsx(
                  "flex w-full cursor-pointer flex-col gap-2 p-3",
                  selectedOption?.value === option.value && "bg-other-bg-3 ",
                )}
              >
                <div className="flex cursor-pointer items-center gap-2 text-base font-medium leading-6">
                  {option.prefix}
                  {option.label}
                </div>
                {option.subLabel && (
                  <p className="text-sm leading-5 text-opacityColor-70">
                    {option.subLabel}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuSelect;
