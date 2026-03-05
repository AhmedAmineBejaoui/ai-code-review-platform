"use client";
/* eslint-disable react/no-unescaped-entities */

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Filter,
  Play,
  Upload,
  Info,
  TrendingUp,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { mockAnalyses } from "@/data/mockData";
import { useDashboardUser } from "@/components/dashboard/dashboard-user-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function DeveloperDashboard() {
  const currentUser = useDashboardUser();
  const [timeFilter, setTimeFilter] = useState("7");
  const [severityFilter, setSeverityFilter] = useState("all");

  const ownAnalyses = mockAnalyses.filter((analysis) => analysis.author === currentUser.name);
  const recentAnalyses =
    currentUser.role === "developer" && ownAnalyses.length > 0 ? ownAnalyses.slice(0, 5) : mockAnalyses.slice(0, 5);

  const atRiskPRs = mockAnalyses.filter(a => a.blockerCount > 0);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      done: 'default',
      running: 'secondary',
      failed: 'destructive',
      queued: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="max-w-7xl mx-auto space-y-8"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={item} className="flex justify-between items-start">
        <div>
          <motion.h1 
            className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent mb-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            Dashboard
          </motion.h1>
          <motion.p 
            className="text-gray-600 dark:text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {currentUser.role === 'reviewer' || currentUser.role === 'admin' 
              ? 'Vue d\'ensemble des analyses de l\'Ã©quipe' 
              : 'Suivi de vos analyses'}
          </motion.p>
        </div>
        <div className="flex gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button variant="outline" className="gap-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600">
              <Upload className="h-4 w-4" />
              Importer
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25">
              <Play className="h-4 w-4" />
              Lancer une analyse
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div className="grid md:grid-cols-3 gap-6" variants={item}>
        <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
          <Card className="relative overflow-hidden border-red-500/20 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full blur-3xl" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Security BLOCKER</CardTitle>
              <motion.div 
                className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-orange-500"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <AlertCircle className="h-5 w-5 text-white" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold bg-gradient-to-br from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400 bg-clip-text text-transparent">
                {atRiskPRs.reduce((acc, a) => acc + a.blockerCount, 0)}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {atRiskPRs.length} PR Ã  risque
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
          <Card className="relative overflow-hidden border-orange-500/20 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/30 dark:to-yellow-950/30 backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-full blur-3xl" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Quality WARN</CardTitle>
              <motion.div 
                className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <AlertTriangle className="h-5 w-5 text-white" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold bg-gradient-to-br from-orange-600 to-yellow-600 dark:from-orange-400 dark:to-yellow-400 bg-clip-text text-transparent">
                {mockAnalyses.reduce((acc, a) => acc + a.warnCount, 0)}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Warnings dÃ©tectÃ©s
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
          <Card className="relative overflow-hidden border-green-500/20 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full blur-3xl" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Analyses rÃ©ussies</CardTitle>
              <motion.div 
                className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <CheckCircle2 className="h-5 w-5 text-white" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold bg-gradient-to-br from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                {mockAnalyses.filter(a => a.status === 'done').length}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Sur {mockAnalyses.length} analyses
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={item}>
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Repository</label>
                <Select defaultValue="all">
                  <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les repos</SelectItem>
                    <SelectItem value="backend-api">backend-api</SelectItem>
                    <SelectItem value="frontend-app">frontend-app</SelectItem>
                    <SelectItem value="mobile-app">mobile-app</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">PÃ©riode</label>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 derniers jours</SelectItem>
                    <SelectItem value="30">30 derniers jours</SelectItem>
                    <SelectItem value="90">90 derniers jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">SÃ©vÃ©ritÃ©</label>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="BLOCKER">BLOCKER uniquement</SelectItem>
                    <SelectItem value="WARN">WARN et plus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Analyses */}
      <motion.div variants={item}>
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Analyses rÃ©centes
              </CardTitle>
              <Link href="/dashboard/analyses">
                <Button variant="ghost" size="sm" className="gap-2 group">
                  Voir tout
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAnalyses.map((analysis, index) => (
                <motion.div
                  key={analysis.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ x: 4, scale: 1.01 }}
                  className="group"
                >
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50 dark:to-transparent border border-gray-200/50 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 transition-all">
                    <div className="flex-shrink-0">
                      {getStatusIcon(analysis.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-white">{analysis.repo}</span>
                        <span className="text-gray-400">â€¢</span>
                        <span className="text-sm text-blue-600 dark:text-blue-400">{analysis.pr}</span>
                        {getStatusBadge(analysis.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>{analysis.author}</span>
                        <span>â€¢</span>
                        <span>{new Date(analysis.date).toLocaleString('fr-FR', { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}</span>
                        <span>â€¢</span>
                        <span>{analysis.duration}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {analysis.blockerCount > 0 && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {analysis.blockerCount}
                        </Badge>
                      )}
                      {analysis.warnCount > 0 && (
                        <Badge className="gap-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                          <AlertTriangle className="h-3 w-3" />
                          {analysis.warnCount}
                        </Badge>
                      )}
                      {analysis.infoCount > 0 && (
                        <Badge variant="outline" className="gap-1">
                          <Info className="h-3 w-3" />
                          {analysis.infoCount}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {analysis.status === 'done' && analysis.findings.length > 0 && (
                        <>
                          <Link href={`/dashboard/report/${analysis.id}`}>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button variant="outline" size="sm">
                                Rapport
                              </Button>
                            </motion.div>
                          </Link>
                          <Link href={`/dashboard/diff/${analysis.id}`}>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                                Voir le diff
                              </Button>
                            </motion.div>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
