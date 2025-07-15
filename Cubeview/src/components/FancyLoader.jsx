// src/components/FancyLoader.jsx
import { motion } from "framer-motion";
import { ReloadIcon } from "@radix-ui/react-icons";

export default function FancyLoader({ message = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center mt-16 text-gray-500">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-10 h-10"
      >
        <ReloadIcon className="w-full h-full text-blue-500" />
      </motion.div>
      <p className="text-sm mt-2">{message}</p>
    </div>
  );
}
