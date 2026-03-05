"use client";
/* eslint-disable react/no-unescaped-entities */

import { useState } from "react";
import { motion } from "framer-motion";
import { Activity, Download, RotateCw, AlertCircle, Sparkles, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

const mockLogs = {
  api: [
    {
      id: '1',
      timestamp: '2026-03-04T10:30:00',
      level: 'info',
      message: 'Webhook received from GitHub - PR #456',
      details: 'Repository: backend-api',
    },
    {
      id: '2',
      timestamp: '2026-03-04T10:29:45',
      level: 'error',
      message: 'Failed to process webhook',
      details: 'Invalid payload format',
    },
  ],
  workers: [
    {
      id: '1',
      timestamp: '2026-03-04T10:28:00',
      level: 'info',
      message: 'Analysis job started',
      details: 'Job ID: job-12345',
    },
    {
      id: '2',
      timestamp: '2026-03-04T10:25:30',
      level: 'warn',
      message: 'Worker queue high',
      details: '45 jobs pending',
    },
  ],
  ingestion: [
    {
      id: '1',
      timestamp: '2026-03-04T08:00:00',
      level: 'info',
      message: 'KB ingestion completed',
      details: '142 chunks indexed',
    },
  ],
};

export function Observability() {
  const [activeTab, setActiveTab] = useState("api");

  const getLevelBadge = (level: string) => {
    const variants: Record<string, any> = {
      info: 'default',
      warn: 'secondary',
      error: 'destructive',
    };
    return <Badge variant={variants[level]}>{level}</Badge>;
  };

  const metrics = [
    { label: 'Taux d\'Ã©chec', value: 2.3, unit: '%', icon: Activity, gradient: 'from-red-500 to-orange-500', max: 10 },
    { label: 'Latence moyenne', value: 1.8, unit: 's', icon: Activity, gradient: 'from-blue-500 to-cyan-500', max: 5 },
    { label: 'Analyses aujourd\'hui', value: 127, unit: '', icon: Activity, gradient: 'from-green-500 to-emerald-500', max: 200 },
    { label: 'Workers actifs', value: '8/12', unit: '', icon: Activity, gradient: 'from-purple-500 to-pink-500', max: 100 },
  ];

  return (
    <motion.div 
      className="max-w-6xl mx-auto space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div 
        className="flex justify-between items-start"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-pink-900 to-rose-900 dark:from-white dark:via-pink-100 dark:to-rose-100 bg-clip-text text-transparent mb-2 flex items-center gap-3">
            <Activity className="h-10 w-10 text-pink-500" />
            ObservabilitÃ© & Logs
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Supervision de la plateforme
          </p>
        </div>
        <div className="flex gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button variant="outline" className="gap-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl">
              <Download className="h-4 w-4" />
              TÃ©lÃ©charger logs
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02, rotate: 180 }} whileTap={{ scale: 0.98 }}>
            <Button variant="outline" className="gap-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl">
              <RotateCw className="h-4 w-4" />
              Actualiser
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            whileHover={{ y: -4, scale: 1.02 }}
          >
            <Card className="relative overflow-hidden bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${metric.gradient} opacity-20 rounded-full blur-2xl`} />
              <CardContent className="pt-6 relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {metric.label}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {metric.value}{metric.unit}
                    </p>
                  </div>
                  <motion.div 
                    className={`p-3 rounded-xl bg-gradient-to-br ${metric.gradient}`}
                    whileHover={{ scale: 1.1, rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    <metric.icon className="h-6 w-6 text-white" />
                  </motion.div>
                </div>
                {typeof metric.value === 'number' && (
                  <Progress value={(metric.value / metric.max) * 100} className="h-2" />
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Active Issues */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 backdrop-blur-xl border-orange-200/50 dark:border-orange-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </motion.div>
              ProblÃ¨mes actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <motion.div 
              className="flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-gray-900/50 border border-orange-300 dark:border-orange-700"
              whileHover={{ x: 4 }}
            >
              <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                  Worker queue saturation
                </div>
                <div className="text-sm text-orange-800 dark:text-orange-200">
                  45 jobs en attente. ConsidÃ©rez l'ajout de workers supplÃ©mentaires.
                </div>
              </div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" size="sm" className="bg-white dark:bg-gray-800">
                  Investiguer
                </Button>
              </motion.div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Logs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Logs systÃ¨me
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-800">
                <TabsTrigger value="api">API / Webhooks</TabsTrigger>
                <TabsTrigger value="workers">Workers</TabsTrigger>
                <TabsTrigger value="ingestion">Ingestion KB</TabsTrigger>
              </TabsList>
              
              <TabsContent value="api" className="mt-4">
                <div className="rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>DÃ©tails</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockLogs.api.map((log, index) => (
                        <motion.tr
                          key={log.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <TableCell className="font-mono text-xs text-gray-600 dark:text-gray-400">
                            {new Date(log.timestamp).toLocaleString('fr-FR')}
                          </TableCell>
                          <TableCell>{getLevelBadge(log.level)}</TableCell>
                          <TableCell className="font-medium text-gray-900 dark:text-white">
                            {log.message}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                            {log.details}
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="workers" className="mt-4">
                <div className="rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>DÃ©tails</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockLogs.workers.map((log, index) => (
                        <motion.tr
                          key={log.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <TableCell className="font-mono text-xs text-gray-600 dark:text-gray-400">
                            {new Date(log.timestamp).toLocaleString('fr-FR')}
                          </TableCell>
                          <TableCell>{getLevelBadge(log.level)}</TableCell>
                          <TableCell className="font-medium text-gray-900 dark:text-white">
                            {log.message}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                            {log.details}
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="ingestion" className="mt-4">
                <div className="rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>DÃ©tails</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockLogs.ingestion.map((log, index) => (
                        <motion.tr
                          key={log.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <TableCell className="font-mono text-xs text-gray-600 dark:text-gray-400">
                            {new Date(log.timestamp).toLocaleString('fr-FR')}
                          </TableCell>
                          <TableCell>{getLevelBadge(log.level)}</TableCell>
                          <TableCell className="font-medium text-gray-900 dark:text-white">
                            {log.message}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                            {log.details}
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      {/* Job Queue */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <CardTitle>File d'attente des jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <motion.div 
              className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200/50 dark:border-blue-800/50"
              whileHover={{ x: 4 }}
            >
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">job-12345</span>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Analysis - backend-api PR #456
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>running</Badge>
                <motion.div whileHover={{ scale: 1.05, rotate: 180 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <RotateCw className="h-3 w-3" />
                    Relancer
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
