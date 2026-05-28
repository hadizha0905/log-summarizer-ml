/**
 * Анимированная карточка с градиентным бордером
 */

import React, { useRef, useEffect } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
  delay?: number;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className = '',
  gradient = true,
  delay = 0,
}) => {
  const controls = useAnimation();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  useEffect(() => {
    if (inView) {
      controls.start('visible');
    }
  }, [controls, inView]);

  const cardVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        damping: 12,
        stiffness: 100,
        delay,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={cardVariants}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={`relative ${className}`}
    >
      {gradient && (
        <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 blur transition duration-500 group-hover:opacity-30" />
      )}
      <div className="relative rounded-xl border border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        {children}
      </div>
    </motion.div>
  );
};

export default AnimatedCard;
