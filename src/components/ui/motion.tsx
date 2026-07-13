import { motion, useReducedMotion } from 'framer-motion';
import React from 'react';

export interface RevealProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
}

const MotionDiv = motion.div;

export const Reveal: React.FC<RevealProps> = ({
  children,
  index = 0,
  className,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const delay = Math.min(index, 10) * 0.04;

  return (
    <MotionDiv
      className={className}
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut', delay }}
    >
      {children}
    </MotionDiv>
  );
};

export interface RevealListProps {
  children: React.ReactNode[];
  className?: string;
}

export const RevealList: React.FC<RevealListProps> = ({
  children,
  className,
}) => (
  <>
    {React.Children.map(children, (child, index) => (
      <Reveal key={index} index={index} className={className}>
        {child}
      </Reveal>
    ))}
  </>
);
