/* eslint-disable @next/next/no-img-element */
import { cn } from "@charm/utils/cn";
import { useEffect, useState } from "react";

export type AvatarProps = {
  src: string;
  alt: string;
  fallback?: React.ReactNode;
  className?: string;
  size?: number | string;
  fallbackDelay?: number;
};

const Avatar = ({
  src,
  alt,
  fallback,
  className = "",
  size = 40,
  fallbackDelay = 0,
}: AvatarProps) => {
  const [imageError, setImageError] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (fallbackDelay && imageError) {
      const timer = setTimeout(() => setShowFallback(true), fallbackDelay);
      return () => clearTimeout(timer);
    }

    setShowFallback(imageError);
    return;
  }, [imageError, fallbackDelay]);

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-full overflow-hidden bg-gray-100",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {!imageError && (
        <img
          src={src}
          alt={alt}
          className="size-full object-cover"
          onError={() => setImageError(true)}
        />
      )}
      {showFallback && (
        <div className="flex size-full items-center justify-center">
          {fallback}
        </div>
      )}
    </div>
  );
};

export default Avatar;
