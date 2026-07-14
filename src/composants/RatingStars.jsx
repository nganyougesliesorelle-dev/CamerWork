import React from 'react';
import { Star } from 'lucide-react';

/**
 * RatingStars — clickable 1-5 star rating component.
 * Props:
 *   rating    : current rating (0-5)
 *   onChange  : callback with new rating value (or null to make read-only)
 *   size      : star icon size in px (default 16)
 *   className : extra classes on the wrapper
 */
export function RatingStars({ rating = 0, onChange, size = 16, className = '' }) {
  const interactive = typeof onChange === 'function';

  const handleClick = (starValue) => {
    if (!interactive) return;
    // toggle: clicking the same star clears the rating
    onChange(rating === starValue ? 0 : starValue);
  };

  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= rating;
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => handleClick(star)}
            className={`transition-colors ${
              interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'
            }`}
            title={interactive ? `${star} étoile${star > 1 ? 's' : ''}` : undefined}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
          >
            <Star
              size={size}
              className={
                filled
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-gray-300 dark:text-gray-600'
              }
            />
          </button>
        );
      })}
    </div>
  );
}

export default RatingStars;
