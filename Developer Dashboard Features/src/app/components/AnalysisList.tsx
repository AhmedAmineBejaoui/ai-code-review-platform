import { useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { 
  Search, 
  Download, 
  RotateCw, 
  Eye,
  GitCompare,
  AlertCircle,
  AlertTriangle,
  Info,
  Filter,
} from "lucide-react";
import { mockAnalyses } from "../data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

export function AnalysisList() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAnalyses = mockAnalyses.filter(a => 
    a.repo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.pr.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      done: 'default',
      running: 'secondary',
      failed: 'destructive',
      queued: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <motion.div 
      className="max-w-7xl mx-auto space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent mb-2">
          Liste des analyses
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Retrouvez toutes les analyses associées aux PRs et commits
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Filter className="h-5 w-5 text-purple-500" />
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par repo, PR, ou auteur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                    <TableHead>Repository</TableHead>
                    <TableHead>PR / Commit</TableHead>
                    <TableHead>Auteur</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Findings</TableHead>
                    <TableHead>Distribution</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnalyses.map((analysis, index) => (
                    <motion.tr
                      key={analysis.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <TableCell className="font-medium text-gray-900 dark:text-white">
                        {analysis.repo}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            {analysis.pr}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {analysis.commit}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        {analysis.author}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400 text-sm">
                        {new Date(analysis.date).toLocaleString('fr-FR', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>{getStatusBadge(analysis.status)}</TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400">
                        {analysis.duration}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {analysis.blockerCount + analysis.warnCount + analysis.infoCount}
                        </span>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {analysis.status === 'done' && analysis.findings.length > 0 && (
                            <>
                              <Link to={`/report/${analysis.id}`}>
                                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                  <Button variant="ghost" size="icon" title="View report">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </motion.div>
                              </Link>
                              <Link to={`/diff/${analysis.id}`}>
                                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                  <Button variant="ghost" size="icon" title="View diff">
                                    <GitCompare className="h-4 w-4" />
                                  </Button>
                                </motion.div>
                              </Link>
                            </>
                          )}
                          <motion.div whileHover={{ scale: 1.1, rotate: 180 }} whileTap={{ scale: 0.9 }}>
                            <Button variant="ghost" size="icon" title="Re-run analysis">
                              <RotateCw className="h-4 w-4" />
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button variant="ghost" size="icon" title="Download JSON">
                              <Download className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
