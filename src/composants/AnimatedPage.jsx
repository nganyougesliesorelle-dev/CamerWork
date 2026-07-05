/**
 * AnimatedPage — Wrapper framer-motion pour les transitions de page.
 * 
 * Usage :
 *   <AnimatedPage><JobList /></AnimatedPage>
 * 
 * Effet : fondu (opacity) + glissement vers le haut (y: 20 → 0)
 *         avec une durée de 0.4s en ease-out.
 */
import { motion } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.25 } },
};

export function AnimatedPage({ children, className = '' }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * StaggerChildren — Applique un délai en cascade aux enfants directs.
 * Chaque enfant reçoit un délai incrémental (staggerChildren: 0.08s).
 */
const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const slideUpItem = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

export function StaggerContainer({ children, className = '' }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '' }) {
  return (
    <motion.div variants={slideUpItem} className={className}>
      {children}
    </motion.div>
  );
}
