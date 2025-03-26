"use client";

import BackArrowIcon from "@charm/static/icons/back-arrow.svg?react";
import ForwardArrowIcon from "@charm/static/icons/forward-arrow.svg?react";
import { cn } from "@charm/utils/cn";
import type { HTMLProps, MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";

export type SliderItem = {
  title: string;
  id: string;
} & HTMLProps<"div">;

export type ButtonSliderProps = {
  items: SliderItem[];
  onItemSelected?: (id: string) => void;
};

const ButtonSlider = ({ items, onItemSelected }: ButtonSliderProps) => {
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startX, setStartX] = useState<number>(0);
  const [scrollLeft, setScrollLeft] = useState<number>(0);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(true);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const updateButtonStates = () => {
    if (sliderRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth);
    }
  };

  const handlePrev = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({
        left: -150,
        behavior: "smooth",
      });
      updateButtonStates();
    }
  };

  const handleNext = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({
        left: 150,
        behavior: "smooth",
      });
      updateButtonStates();
    }
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (sliderRef.current) {
      setIsDragging(true);
      setStartX(e.pageX - sliderRef.current.offsetLeft);
      setScrollLeft(sliderRef.current.scrollLeft);
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !sliderRef.current) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX) * 1;
    sliderRef.current.scrollLeft = scrollLeft - walk;
    updateButtonStates();
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;
    const onScroll = () => updateButtonStates();
    slider.addEventListener("scroll", onScroll);
    updateButtonStates();

    return () => {
      slider.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="relative flex w-full items-center">
      <button
        type="button"
        onClick={handlePrev}
        disabled={!canScrollLeft}
        className={cn(
          "absolute z-10 left-0 top-1/2 size-11 -translate-y-1/2 items-center justify-center bg-gradient-to-r from-35% from-[#15171D] fill-white",
          canScrollLeft ? "flex" : "hidden",
        )}
      >
        <p className="sr-only">Prev</p>
        <BackArrowIcon />
      </button>
      <button
        type="button"
        onClick={handleNext}
        disabled={!canScrollRight}
        className={cn(
          "absolute z-10 right-[-24px] top-1/2 size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-gradient-to-l from-[#15171D] from-65% fill-white",
          canScrollRight ? "flex" : "hidden",
        )}
      >
        <p className="sr-only">Next</p>
        <ForwardArrowIcon />
      </button>

      <div
        ref={sliderRef}
        className="scrollbar-hide relative flex w-full cursor-grab gap-2 overflow-x-auto"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseUp}
        onMouseUp={handleMouseUp}
      >
        {items?.map((item, index) => {
          return (
            <div
              onClick={() => {
                setActiveIndex(index);
                onItemSelected?.(item.id);
              }}
              key={item.id ? item.id : `${item.title}_${index}`}
              className={cn(
                "flex h-11 w-max cursor-pointer select-none items-center justify-center text-nowrap rounded-xl px-3 text-base font-medium leading-6",
                activeIndex === index
                  ? "bg-other-bg-2 text-white"
                  : "text-opacityColor-70",
              )}
            >
              {item.title}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ButtonSlider;
