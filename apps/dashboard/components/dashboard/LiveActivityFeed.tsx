"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, ShieldAlert, Bot, GitPullRequest, Zap } from "lucide-react";

interface ActivityItem {
  id: number;
  icon: typeof CheckCircle2;
  iconColor: string;
  message: string;
  time: string;
}

const activityPool: Omit<ActivityItem, "id" | "time">[] = [
  { icon: CheckCircle2, iconColor: "text-emerald-400", message: "Analyse terminée sur skillstream-github-stage" },
  { icon: ShieldAlert, iconColor: "text-red-400", message: "Vulnérabilité SQL injection détectée" },
  { icon: AlertTriangle, iconColor: "text-amber-400", message: "15 nouveaux warnings sur fix/db-schema" },
  { icon: Bot, iconColor: "text-violet-400", message: "IA: Recommandation d'ajout d'index générée" },
  { icon: GitPullRequest, iconColor: "text-blue-400", message: "PR #14 soumise pour analyse" },
  { icon: Zap, iconColor: "text-yellow-400", message: "Performance: temps d'analyse réduit de 23%" },
  { icon: CheckCircle2, iconColor: "text-emerald-400", message: "Toutes les vulnérabilités résolues sur PR #1" },
  { icon: Bot, iconColor: "text-violet-400", message: "IA: Pattern de code dupliqué détecté dans 3 fichiers" },
  { icon: ShieldAlert, iconColor: "text-red-400", message: "Token non chiffré détecté dans .env" },
  { icon: AlertTriangle, iconColor: "text-amber-400", message: "Dépendance obsolète: lodash@4.17.15" },
];

export function LiveActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>(() =>
    activityPool.slice(0, 4).map((item, i) => ({
      ...item,
      id: i,
      time: `il y a ${(4 - i) * 2}m`,
    }))
  );
  const [nextId, setNextId] = useState(4);

  useEffect(() => {
    const interval = setInterval(() => {
      const poolItem = activityPool[Math.floor(Math.random() * activityPool.length)];
      setNextId((id) => {
        const newId = id + 1;
        setActivities((prev) => {
          const newItem: ActivityItem = {
            ...poolItem,
            id: newId,
            time: "à l'instant",
          };
          return [newItem, ...prev.slice(0, 4)];
        });
        return newId;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex size-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
        </span>
        <span className="text-xs text-zinc-500 uppercase tracking-wider">Activité en direct</span>
      </div>
      <AnimatePresence mode="popLayout">
        {activities.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, x: -20, height: 0 }}
            animate={{ opacity: 1, x: 0, height: "auto" }}
            exit={{ opacity: 0, x: 20, height: 0 }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
            className="flex items-start gap-2.5 py-2 px-2 rounded-lg hover:bg-zinc-800/30 transition-colors"
          >
            <item.icon className={`size-3.5 mt-0.5 shrink-0 ${item.iconColor}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-300 leading-relaxed truncate">{item.message}</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">{item.time}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
