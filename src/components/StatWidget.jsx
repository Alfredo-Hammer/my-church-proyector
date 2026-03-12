import React from "react";
import {motion} from "framer-motion";

const StatWidget = ({icon: Icon, value, label, accentColor = "emerald"}) => {
  const colorClasses = {
    emerald: "bg-emerald-500/5 border-emerald-500/20 text-emerald-400",
    amber: "bg-amber-500/5 border-amber-500/20 text-amber-400",
    indigo: "bg-indigo-500/5 border-indigo-500/20 text-indigo-400",
    rose: "bg-rose-500/5 border-rose-500/20 text-rose-400",
  };

  const colors = colorClasses[accentColor] || colorClasses.emerald;

  return (
    <motion.div
      initial={{opacity: 0, y: 20}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.4}}
      className={`rounded-xl p-4 border backdrop-blur-sm ${colors} transition-all hover:shadow-lg`}
    >
      <div className="flex flex-col items-center text-center gap-2">
        {Icon && <Icon className="text-xl" />}
        <div>
          <div className="text-2xl md:text-3xl font-bold text-white">
            {value}
          </div>
          <div className="text-xs md:text-sm text-white/60 whitespace-nowrap">
            {label}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StatWidget;
