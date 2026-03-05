"use client";
/* eslint-disable react/no-unescaped-entities */


import { motion } from "framer-motion";
import { 
  TrendingDown, 
  TrendingUp, 
  Minus,
  CheckCircle2,
  XCircle,
  RotateCw,
  MessageSquare,
  GitCompare,
} from "lucide-react";
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

export function HistoryComparison() {

  const comparisonData = {
    previousRun: {
      id: 'run-123',
      date: '2026-03-03T14:20:00',
      blockers: 3,
      warnings: 7,
      info: 10,
    },
    currentRun: {
      id: 'run-124',
      date: '2026-03-04T10:30:00',
      blockers: 2,
      warnings: 5,
      info: 8,
    },
  };

  const resolvedIssues = [
    {
      id: '1',
      title: 'Hardcoded credentials',
      severity: 'BLOCKER',
      category: 'security',
      file: 'src/config/database.ts',
    },
  ];

  const newIssues = [
    {
      id: '2',
      title: 'XSS vulnerability',
      severity: 'BLOCKER',
      category: 'security',
      file: 'src/components/UserProfile.tsx',
    },
  ];

  const severityChanges = [
    {
      id: '3',
      title: 'Missing input validation',
      previousSeverity: 'INFO',
      newSeverity: 'WARN',
      file: 'src/api/users.ts',
    },
  ];

  const getTrendIcon = (prev: number, current: number) => {
    if (current < prev) return <TrendingDown className="h-5 w-5 text-green-500" />;
    if (current > prev) return <TrendingUp className="h-5 w-5 text-red-500" />;
    return <Minus className="h-5 w-5 text-gray-400" />;
  };

  const getTrendColor = (prev: number, current: number) => {
    if (current < prev) return 'text-green-600 dark:text-green-400';
    if (current > prev) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent mb-2 flex items-center gap-3">
            <GitCompare className="h-10 w-10 text-purple-500" />
            Historique & Comparaison
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Analyse de l'Ã©volution entre deux runs
          </p>
        </div>
        <div className="flex gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button variant="outline" className="gap-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl">
              <RotateCw className="h-4 w-4" />
              Re-run
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <MessageSquare className="h-4 w-4" />
              Poster dans la PR
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Overview Comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
            <CardHeader>
              <CardTitle className="text-base">Run prÃ©cÃ©dent</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {new Date(comparisonData.previousRun.date).toLocaleString('fr-FR')}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: 'BLOCKER', value: comparisonData.previousRun.blockers, color: 'destructive' },
                  { label: 'WARN', value: comparisonData.previousRun.warnings, color: 'secondary' },
                  { label: 'INFO', value: comparisonData.previousRun.info, color: 'outline' },
                ].map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {item.label}
                    </span>
                    <Badge variant={item.color as any}>{item.value}</Badge>
                  </motion.div>
                ))}
                <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700 font-semibold">
                  <span className="text-sm text-gray-900 dark:text-white">Total</span>
                  <span className="text-gray-900 dark:text-white">
                    {comparisonData.previousRun.blockers +
                      comparisonData.previousRun.warnings +
                      comparisonData.previousRun.info}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 backdrop-blur-xl border-blue-200/50 dark:border-blue-800/50">
            <CardHeader>
              <CardTitle className="text-base">Run actuel</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {new Date(comparisonData.currentRun.date).toLocaleString('fr-FR')}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: 'BLOCKER', prev: comparisonData.previousRun.blockers, value: comparisonData.currentRun.blockers, color: 'destructive' },
                  { label: 'WARN', prev: comparisonData.previousRun.warnings, value: comparisonData.currentRun.warnings, color: 'secondary' },
                  { label: 'INFO', prev: comparisonData.previousRun.info, value: comparisonData.currentRun.info, color: 'outline' },
                ].map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="flex justify-between items-center p-2 rounded-lg hover:bg-blue-100/50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <span className="text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      {item.label}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                      >
                        {getTrendIcon(item.prev, item.value)}
                      </motion.div>
                    </span>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium ${getTrendColor(item.prev, item.value)}`}>
                        {item.value > item.prev ? '+' : ''}{item.value - item.prev}
                      </span>
                      <Badge variant={item.color as any}>{item.value}</Badge>
                    </div>
                  </motion.div>
                ))}
                <div className="flex justify-between items-center pt-3 border-t border-blue-200 dark:border-blue-800 font-semibold">
                  <span className="text-sm text-gray-900 dark:text-white">Total</span>
                  <span className="text-gray-900 dark:text-white">
                    {comparisonData.currentRun.blockers +
                      comparisonData.currentRun.warnings +
                      comparisonData.currentRun.info}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Resolved Issues */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 backdrop-blur-xl border-green-200/50 dark:border-green-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.2, rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </motion.div>
              Findings rÃ©solus ({resolvedIssues.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-green-100/50 dark:hover:bg-green-900/10">
                  <TableHead>Titre</TableHead>
                  <TableHead>SÃ©vÃ©ritÃ©</TableHead>
                  <TableHead>CatÃ©gorie</TableHead>
                  <TableHead>Fichier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resolvedIssues.map((issue, index) => (
                  <motion.tr
                    key={issue.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="bg-green-100/50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
                  >
                    <TableCell className="font-medium">{issue.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{issue.severity}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{issue.category}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {issue.file}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* New Issues */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 backdrop-blur-xl border-red-200/50 dark:border-red-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.2 }}
                transition={{ duration: 0.3 }}
              >
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </motion.div>
              Nouveaux problÃ¨mes ({newIssues.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-red-100/50 dark:hover:bg-red-900/10">
                  <TableHead>Titre</TableHead>
                  <TableHead>SÃ©vÃ©ritÃ©</TableHead>
                  <TableHead>CatÃ©gorie</TableHead>
                  <TableHead>Fichier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {newIssues.map((issue, index) => (
                  <motion.tr
                    key={issue.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="bg-red-100/50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30"
                  >
                    <TableCell className="font-medium">{issue.title}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{issue.severity}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{issue.category}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {issue.file}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Severity Changes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/30 dark:to-yellow-950/30 backdrop-blur-xl border-orange-200/50 dark:border-orange-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.2, rotate: 45 }}
                transition={{ duration: 0.3 }}
              >
                <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </motion.div>
              Changements de sÃ©vÃ©ritÃ© ({severityChanges.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-orange-100/50 dark:hover:bg-orange-900/10">
                  <TableHead>Titre</TableHead>
                  <TableHead>PrÃ©cÃ©dent</TableHead>
                  <TableHead>Nouveau</TableHead>
                  <TableHead>Fichier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {severityChanges.map((change, index) => (
                  <motion.tr
                    key={change.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="bg-orange-100/50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                  >
                    <TableCell className="font-medium">{change.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{change.previousSeverity}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-orange-500 hover:bg-orange-600">
                        {change.newSeverity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {change.file}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
