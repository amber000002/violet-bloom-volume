import React from "react";
import { motion } from "framer-motion";

const generateSparkles = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 3 + 2,
    delay: Math.random() * 2,
  }));
};

export const Sparkles: React.FC<{ count?: number }> = ({ count = 30 }) => {
  const sparkles = React.useMemo(() => generateSparkles(count), [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {sparkles.map((sparkle) => (
        <motion.div
          key={sparkle.id}
          className="absolute rounded-full"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            width: sparkle.size,
            height: sparkle.size,
            background: `radial-gradient(circle, hsl(280 100% 80% / 0.8), hsl(330 100% 70% / 0.4))`,
            boxShadow: `0 0 ${sparkle.size * 2}px hsl(280 100% 70% / 0.5)`,
          }}
          animate={{
            opacity: [0.2, 1, 0.2],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: sparkle.duration,
            delay: sparkle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};
