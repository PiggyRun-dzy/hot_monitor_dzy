import { useEffect, useState } from 'react';

/**
 * Auto-playing shooting stars — 2-3 stars, calm pace, start quickly
 */
export default function ShootingStar() {
  const [stars, setStars] = useState([]);

  useEffect(() => {
    const count = 2 + Math.floor(Math.random() * 2); // 2-3 stars
    const newStars = Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${5 + Math.random() * 90}%`,
      delay: `${i * 0.3 + Math.random() * 0.4}s`,   // 0-1s initial delay
      duration: `${2 + Math.random() * 2}s`,          // 2-4s per fall
      height: `${60 + Math.random() * 80}px`,
    }));
    setStars(newStars);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      {stars.map(s => (
        <div key={s.id}
          className="star-beam"
          style={{
            left: s.left,
            height: s.height,
            animationDelay: s.delay,
            animationDuration: s.duration,
          }}
        />
      ))}
    </div>
  );
}
