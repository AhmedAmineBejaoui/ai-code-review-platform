"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  Bot,
  GitPullRequest,
  Zap,
} from "lucide-react";

interface ActivityItem {
  id: number;
  icon: React.ElementType;
  iconColor: string;
  message: string;
  time: string;
}

const activityPool: Omit<ActivityItem, "id" | "time">[] = [
  {
    icon: CheckCircle2,
    iconColor: "text-emerald-400",
    message: "Analyse terminée sur skillstream-github-stage",
  },
  {
    icon: ShieldAlert,
    iconColor: "text-red-400",
    message: "Vulnérabilité SQL injection détectée",
  },
  {
    icon: AlertTriangle,
    iconColor: "text-amber-400",
    message: "15 nouveaux warnings sur fix/db-schema",
  },
  {
    icon: Bot,
    iconColor: "text-violet-400",
    message: "Revue IA complétée pour PR #42",
  },
  {
    icon: GitPullRequest,
    iconColor: "text-blue-400",
    message: "Nouvelle PR détectée: feature/auth-module",
  },
  {
    icon: Zap,
    iconColor: "text-yellow-400",
    message: "Performance: temps d'analyse réduit de 23%",
  },
  {
    icon: ShieldAlert,
    iconColor: "text-red-400",
    message: "2 secrets exposés dans config.yaml",
  },
  {
    icon: CheckCircle2,
    iconColor: "text-emerald-400",
    message: "PR #38 approuvée automatiquement",
  },
  {
    icon: AlertTriangle,
    iconColor: "text-amber-400",
    message: "Code dupliqué détecté dans utils/",
  },
  {
    icon: Bot,
    iconColor: "text-violet-400",
    message: "Suggestions de refactoring générées",
  },
];

export function LiveActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>(() => {
    const initial: ActivityItem[] = [];
    for (let i = 0; i < 4; i++) {
      const poolItem = activityPool[i % activityPool.length];
      initial.push({
        id: i,
        ...poolItem,
        time: "à l'instant",
      });
    }
    return initial;
  });
  const [nextId, setNextId] = useState(4);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * activityPool.length);
      const poolItem = activityPool[randomIndex];

      setActivities((prev) => {
        const newActivity: ActivityItem = {
          id: nextId,
          ...poolItem,
          time: "à l'instant",
        };
        const updated = [newActivity, ...prev.slice(0, 4)];
        return updated;
      });
      setNextId((prev) => prev + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, [nextId]);

  return (
    <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-2xl p-5 h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 relative" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Activité en direct
        </span>
      </div>

      {/* Activity Items */}
      <div className="space-y-1">
        <AnimatePresence mode="popLayout">
          {activities.map((activity) => {
            const Icon = activity.icon;
            return (
              <motion.div
                key={activity.id}
                layout
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{
                  type: "spring",
                  bounce: 0.15,
                  duration: 0.5,
                }}
                className="flex items-start gap-3 py-2"
              >
                <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${activity.iconColor}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white leading-tight truncate">
                    {activity.message}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {activity.time}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
