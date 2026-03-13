import React from "react";
import {motion} from "framer-motion";

const QuickAccessButton = ({icon: Icon, label, onClick, color = "emerald"}) => {
  const colorClasses = {
    emerald:
      "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20",
    amber:
      "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20",
    indigo:
      "bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20",
    rose: "bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20",
  };

  const colorClass = colorClasses[color] || colorClasses.emerald;

  return (
    <motion.button
      initial={{opacity: 0, y: 20}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.4}}
      whileHover={{scale: 1.05}}
      whileTap={{scale: 0.95}}
      onClick={onClick}
      className={`w-full rounded-xl p-2.5 sm:p-5 border backdrop-blur-sm ${colorClass} transition-all flex flex-col items-center justify-center gap-1.5 sm:gap-3 hover:shadow-lg min-h-[84px] sm:min-h-[120px]`}
    >
      {Icon && <Icon className="text-2xl sm:text-3xl md:text-4xl" />}
      <span className="text-xs sm:text-sm md:text-base font-semibold text-center text-white">
        {label}
      </span>
    </motion.button>
  );
};

export default QuickAccessButton;
