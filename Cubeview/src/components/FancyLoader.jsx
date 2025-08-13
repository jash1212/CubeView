// src/components/FancyLoader.jsx
import { motion } from "framer-motion";
import { ReloadIcon } from "@radix-ui/react-icons";

export default function FancyLoader({ message = "Loading..." }) {
const barVariants = {
    start: { opacity: 0.4, y: 0, scaleY: 1 },
    end: { opacity: 1, y: -12, scaleY: 1.2 },
  };

  return (
    <div className="flex flex-col items-center justify-center mt-16">
      {/* Wave bars */}
      <motion.div
        className="flex space-x-1 backdrop-blur-md p-4 rounded-2xl bg-white/10"
        initial="start"
        animate="end"
        transition={{
          repeat: Infinity,
          repeatType: "mirror",
          duration: 0.9,
          ease: "easeInOut",
          staggerChildren: 0.15,
        }}
      >
        {[...Array(5)].map((_, i) => (
          <motion.span
            key={i}
            className="w-2 h-8 rounded-full bg-gradient-to-t from-blue-300 to-blue-500 shadow-lg shadow-blue-500/40"
            variants={barVariants}
            transition={{
              repeat: Infinity,
              repeatType: "mirror",
              duration: 0.9,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>

      {/* Reflection effect */}
      <div className="flex space-x-1 mt-1 opacity-30 blur-sm">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="w-2 h-4 rounded-full bg-gradient-to-t from-pink-300 to-blue-500"
          />
        ))}
      </div>

      {/* Text */}
      <p className="text-sm mt-4 text-gray-500">{message}</p>
    </div>
  );
}
