import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<'down' | 'up'>('down');
  const [horizontalAlign, setHorizontalAlign] = useState<'left' | 'right'>('left');
  const [maxMenuHeight, setMaxMenuHeight] = useState<number>(300);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const calculatePlacement = useCallback(() => {
    if (!dropdownRef.current) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedHeight = Math.min(options.length * 46 + 16, 280);

    if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
      setPlacement('up');
      setMaxMenuHeight(Math.max(140, Math.min(spaceAbove - 16, 320)));
    } else {
      setPlacement('down');
      setMaxMenuHeight(Math.max(140, Math.min(spaceBelow - 16, 320)));
    }

    if (rect.left + 300 > viewportWidth && rect.right - 300 >= 0) {
      setHorizontalAlign('right');
    } else {
      setHorizontalAlign('left');
    }
  }, [options.length]);

  const toggleDropdown = () => {
    if (!isOpen) {
      calculatePlacement();
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;

    calculatePlacement();

    const handleScrollOrResize = () => {
      calculatePlacement();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, calculatePlacement]);

  return (
    <div className="custom-select-container" ref={dropdownRef}>
      {label && <label className="custom-select-label">{label}</label>}
      <button
        type="button"
        className={`custom-select-trigger ${isOpen ? 'open' : ''} ${isOpen && placement === 'up' ? 'open-up' : ''}`}
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="selected-content">
          {selectedOption ? (
            <span className="selected-item-text">
              <span className="option-title">{selectedOption.label}</span>
            </span>
          ) : (
            <span className="placeholder-text">{placeholder}</span>
          )}
        </span>
        <svg
          className={`select-chevron ${isOpen ? (placement === 'up' ? 'rotate-up' : 'rotate') : ''}`}
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {isOpen && (
        <ul
          ref={menuRef}
          className={`custom-select-menu placement-${placement} align-${horizontalAlign}`}
          role="listbox"
          style={{
            maxHeight: `${maxMenuHeight}px`,
          }}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                <div className="option-left">
                  <div>
                    <span className="option-main-label">{option.label}</span>
                    {option.sublabel && (
                      <span className="option-sub-desc">{option.sublabel}</span>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <svg
                    className="check-icon"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
