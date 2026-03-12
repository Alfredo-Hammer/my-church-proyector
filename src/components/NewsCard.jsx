import React from "react";
import {motion} from "framer-motion";
import {FaCalendarAlt} from "react-icons/fa";

const NewsCard = ({title, description, date, image}) => {
  return (
    <motion.div
      initial={{opacity: 0, y: 20}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.4}}
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:shadow-lg transition-all"
    >
      {image && (
        <div className="relative h-40 overflow-hidden">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover hover:scale-105 transition-transform"
          />
        </div>
      )}
      <div className="p-4">
        <h3 className="text-lg md:text-xl font-semibold text-white mb-2 line-clamp-2">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-white/60 mb-3 line-clamp-2">
            {description}
          </p>
        )}
        {date && (
          <div className="flex items-center gap-2 text-xs text-white/50">
            <FaCalendarAlt className="text-xs" />
            <span>{date}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default NewsCard;
