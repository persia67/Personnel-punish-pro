import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Violation, Reward, SystemMode } from '../types';
import { AlertTriangle, Users, Activity, Medal, Star, ThumbsUp } from 'lucide-react';
import { TRANSLATIONS } from '../constants';

interface DashboardStatsProps {
  violations?: Violation[];
  rewards?: Reward[];
  mode: SystemMode;
  language?: 'fa' | 'en';
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.04,
      staggerDirection: -1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 320,
      damping: 24,
    },
  },
  exit: {
    opacity: 0,
    y: -12,
    scale: 0.96,
    transition: { duration: 0.2 },
  },
};

const DashboardStats: React.FC<DashboardStatsProps> = ({ violations = [], rewards = [], mode, language = 'fa' }) => {
  const t = TRANSLATIONS[language];

  const cards = React.useMemo(() => {
    if (mode === 'REWARD') {
      const totalRewards = rewards.length;
      const exemplaryCount = rewards.filter(r => (r.rewardType as string) === 'Exemplary' || r.score >= 20).length;
      const uniqueRewarded = new Set(rewards.map(r => r.personnelId)).size;

      return [
        {
          id: 'total-rewards',
          title: t.totalRewards,
          value: totalRewards,
          icon: <ThumbsUp className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />,
          bg: 'bg-emerald-50/70',
          border: 'border-emerald-100'
        },
        {
          id: 'exemplary-count',
          title: t.exemplaryPersonnel,
          value: exemplaryCount,
          icon: <Medal className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" />,
          bg: 'bg-yellow-50/70',
          border: 'border-yellow-100'
        },
        {
          id: 'unique-rewarded',
          title: t.honoredPersonnel,
          value: uniqueRewarded,
          icon: <Star className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />,
          bg: 'bg-blue-50/70',
          border: 'border-blue-100'
        }
      ];
    } else {
      const totalViolations = violations.length;
      const criticalViolations = violations.filter(v => v.severity === 'Critical' || v.severity === 'High').length;
      const uniqueEmployees = new Set(violations.map(v => v.personnelId)).size;

      return [
        {
          id: 'total-violations',
          title: t.totalViolations,
          value: totalViolations,
          icon: <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />,
          bg: 'bg-orange-50/70',
          border: 'border-orange-100'
        },
        {
          id: 'critical-violations',
          title: t.highRisk,
          value: criticalViolations,
          icon: <Activity className="w-5 h-5 md:w-6 md:h-6 text-red-600" />,
          bg: 'bg-red-50/70',
          border: 'border-red-100'
        },
        {
          id: 'unique-employees',
          title: t.personnel,
          value: uniqueEmployees,
          icon: <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />,
          bg: 'bg-blue-50/70',
          border: 'border-blue-100'
        }
      ];
    }
  }, [mode, violations, rewards, t]);

  return (
    <div className="mb-4 md:mb-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-6"
        >
          {cards.map((card, index) => (
            <motion.div
              key={card.id}
              variants={cardVariants}
              whileHover={{ y: -3, scale: 1.015, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.98 }}
              className={`p-4 md:p-6 rounded-2xl border ${card.bg} ${card.border} shadow-xs hover:shadow-md transition-shadow relative overflow-hidden`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-xs md:text-sm font-medium text-gray-500 mb-1 truncate">{card.title}</p>
                  <div className="h-8 flex items-center overflow-hidden">
                    <AnimatePresence mode="popLayout">
                      <motion.h3
                        key={card.value}
                        initial={{ opacity: 0, y: 12, scale: 0.85 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -12, scale: 0.85 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                        className="text-xl md:text-2xl font-black text-gray-800 font-mono tracking-tight"
                      >
                        {card.value}
                      </motion.h3>
                    </AnimatePresence>
                  </div>
                </div>
                <motion.div
                  initial={{ scale: 0.8, rotate: -8 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 18, delay: index * 0.06 }}
                  className="p-2.5 rounded-xl bg-white/80 shadow-2xs backdrop-blur-xs flex-shrink-0"
                >
                  {card.icon}
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default DashboardStats;