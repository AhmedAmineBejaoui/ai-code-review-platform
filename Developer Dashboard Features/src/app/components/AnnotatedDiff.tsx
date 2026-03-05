import { useState } from "react";
import { useParams, Link } from "react-router";
import { motion } from "motion/react";
import { 
  Check, 
  Copy, 
  MessageSquare,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { mockAnalyses, mockDiffContent, mockFiles, currentUser } from "../data/mockData";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";

export function AnnotatedDiff() {
  const { id } = useParams();
  const analysis = mockAnalyses.find(a => a.id === id);
  const [selectedFile, setSelectedFile] = useState(mockFiles[0]?.path);
  const [resolvedFindings, setResolvedFindings] = useState<Set<string>>(new Set());

  if (!analysis) {
    return <div>Analyse non trouvée</div>;
  }

  const toggleResolved = (findingId: string) => {
    const newSet = new Set(resolvedFindings);
    if (newSet.has(findingId)) {
      newSet.delete(findingId);
    } else {
      newSet.add(findingId);
    }
    setResolvedFindings(newSet);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'BLOCKER':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'WARN':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, any> = {
      BLOCKER: 'destructive',
      WARN: 'secondary',
      INFO: 'outline',
    };
    return <Badge variant={variants[severity]}>{severity}</Badge>;
  };

  const isReviewer = currentUser.role === 'reviewer' || currentUser.role === 'admin';

  return (
    <motion.div 
      className="max-w-[1800px] mx-auto space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div 
        className="flex justify-between items-start"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent mb-2">
            Diff annoté
          </h1>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <span className="font-medium">{analysis.repo}</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-blue-600 dark:text-blue-400">{analysis.pr}</span>
            <ChevronRight className="h-4 w-4" />
            <span className="font-mono text-sm">{analysis.commit}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Link to={`/history/${id}`}>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="outline" className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
                Historique
              </Button>
            </motion.div>
          </Link>
          <Link to={`/report/${id}`}>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Rapport global
              </Button>
            </motion.div>
          </Link>
        </div>
      </motion.div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: File list */}
        <motion.div 
          className="col-span-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">
                Fichiers modifiés
              </h3>
              <ScrollArea className="h-[600px]">
                <div className="space-y-1">
                  {mockFiles.map((file, index) => (
                    <motion.button
                      key={file.path}
                      onClick={() => setSelectedFile(file.path)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full text-left text-sm p-3 rounded-lg transition-all ${
                        selectedFile === file.path 
                          ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-700/50' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="truncate font-medium">
                        {file.path.split('/').pop()}
                      </div>
                      <div className="text-xs mt-1 flex gap-2">
                        <span className="text-green-600 dark:text-green-400">+{file.additions}</span>
                        <span className="text-red-600 dark:text-red-400">-{file.deletions}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* Center: Diff viewer */}
        <motion.div 
          className="col-span-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/80 dark:to-gray-800/50 px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
              <span className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
                {selectedFile}
              </span>
            </div>
            <ScrollArea className="h-[600px]">
              <pre className="p-4 text-sm font-mono bg-gray-50 dark:bg-gray-900/50">
                {mockDiffContent.split('\n').map((line, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.01 }}
                    className={`${
                      line.startsWith('+') && !line.startsWith('+++')
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                        : line.startsWith('-') && !line.startsWith('---')
                        ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                        : line.startsWith('@@')
                        ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 font-semibold'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="inline-block w-12 text-right pr-4 text-gray-400 dark:text-gray-600 select-none">
                      {idx + 1}
                    </span>
                    {line}
                  </motion.div>
                ))}
              </pre>
            </ScrollArea>
          </Card>
        </motion.div>

        {/* Right: AI Comments */}
        <motion.div 
          className="col-span-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-purple-500" />
                Commentaires IA
              </h3>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4 pr-4">
                  {analysis.findings.map((finding, index) => (
                    <motion.div
                      key={finding.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                      className={`p-4 rounded-xl border transition-all ${
                        resolvedFindings.has(finding.id)
                          ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200/50 dark:border-green-800/50 opacity-60'
                          : 'bg-white dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50'
                      }`}
                    >
                      <div className="flex items-start gap-2 mb-3">
                        {getSeverityIcon(finding.severity)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {finding.title}
                            </span>
                            {resolvedFindings.has(finding.id) && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="p-1 rounded-full bg-green-500"
                              >
                                <Check className="h-3 w-3 text-white" />
                              </motion.div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            {getSeverityBadge(finding.severity)}
                            <Badge variant="outline" className="text-xs">
                              {finding.category}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 font-mono mb-3">
                            {finding.file}:{finding.line}
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                        {finding.description}
                      </p>
                      
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 p-3 rounded-lg mb-3 border border-blue-200/50 dark:border-blue-800/50">
                        <span className="text-xs font-semibold text-blue-900 dark:text-blue-300">
                          💡 Suggestion : 
                        </span>
                        <span className="text-sm text-blue-800 dark:text-blue-200 ml-1">
                          {finding.suggestion}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            variant={resolvedFindings.has(finding.id) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleResolved(finding.id)}
                            className="gap-1"
                          >
                            {resolvedFindings.has(finding.id) ? (
                              <>
                                <X className="h-3 w-3" />
                                Annuler
                              </>
                            ) : (
                              <>
                                <Check className="h-3 w-3" />
                                Résolu
                              </>
                            )}
                          </Button>
                        </motion.div>
                        <Link to={`/rag/${id}`}>
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button variant="outline" size="sm" className="gap-1">
                              <BookOpen className="h-3 w-3" />
                              Source
                            </Button>
                          </motion.div>
                        </Link>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button variant="outline" size="sm" className="gap-1">
                            <Copy className="h-3 w-3" />
                            Copier
                          </Button>
                        </motion.div>
                      </div>

                      {isReviewer && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3 space-y-2">
                          <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                            Actions Reviewer
                          </div>
                          <Textarea
                            placeholder="Ajouter un commentaire..."
                            className="text-sm min-h-[60px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                          />
                          <div className="flex gap-2">
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button size="sm" className="bg-green-500 hover:bg-green-600">
                                Accept
                              </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button variant="outline" size="sm" className="border-red-300 text-red-600 hover:bg-red-50">
                                Reject
                              </Button>
                            </motion.div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
