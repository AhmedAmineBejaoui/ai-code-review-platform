"use client";
/* eslint-disable react/no-unescaped-entities */

import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Download, 
  ExternalLink, 
  RotateCw,
  Shield,
  Zap,
  Code2,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { mockAnalyses } from "@/data/mockData";
import { useDashboardUser } from "@/components/dashboard/dashboard-user-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

export function GlobalReport() {
  const currentUser = useDashboardUser();
  const params = useParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const analysis = mockAnalyses.find(a => a.id === id);

  if (!analysis) {
    return <div>Analyse non trouvÃ©e</div>;
  }

  const isReviewer = currentUser.role === 'reviewer' || currentUser.role === 'admin';

  const categoryFindings = {
    security: analysis.findings.filter(f => f.category === 'security'),
    performance: analysis.findings.filter(f => f.category === 'performance'),
    quality: analysis.findings.filter(f => f.category === 'quality'),
    maintainability: analysis.findings.filter(f => f.category === 'maintainability'),
  };

  const riskScore = analysis.blockerCount * 10 + analysis.warnCount * 3;
  const maxRisk = 100;
  const riskLevel = riskScore > 30 ? 'Ã‰levÃ©' : riskScore > 10 ? 'Moyen' : 'Faible';

  return (
    <motion.div 
      className="max-w-5xl mx-auto space-y-6"
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
            Rapport global
          </h1>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <span className="font-medium">{analysis.repo}</span>
            <span>â€¢</span>
            <span className="text-blue-600 dark:text-blue-400">{analysis.pr}</span>
            <span>â€¢</span>
            <span className="font-mono text-sm">{analysis.commit}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {[
            { icon: Download, label: 'PDF' },
            { icon: Download, label: 'Markdown' },
            { icon: RotateCw, label: 'Re-run' },
          ].map((action, index) => (
            <motion.div 
              key={action.label}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Button variant="outline" className="gap-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
                <action.icon className="h-4 w-4" />
                {action.label}
              </Button>
            </motion.div>
          ))}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <ExternalLink className="h-4 w-4" />
              Ouvrir PR
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 backdrop-blur-xl border-blue-200/50 dark:border-blue-800/50">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              RÃ©sumÃ© automatique des changements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 relative z-10">
            <p className="text-gray-700 dark:text-gray-300">
              Cette PR introduit des modifications dans le systÃ¨me d'authentification et de recherche utilisateur.
              Les changements affectent principalement les fichiers{' '}
              <code className="bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-sm">
                src/api/users.ts
              </code>{' '}
              et{' '}
              <code className="bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-sm">
                src/components/UserProfile.tsx
              </code>.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { label: 'Fichiers modifiÃ©s', value: '5', gradient: 'from-blue-500 to-cyan-500' },
                { label: 'Additions', value: '22 lignes', gradient: 'from-green-500 to-emerald-500' },
                { label: 'Suppressions', value: '11 lignes', gradient: 'from-red-500 to-orange-500' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -4 }}
                  className={`p-4 rounded-xl bg-gradient-to-br ${stat.gradient} text-white shadow-lg`}
                >
                  <div className="text-sm opacity-90 mb-1">{stat.label}</div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Risk Assessment */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-500" />
              Ã‰valuation des risques
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Niveau de risque global
                </span>
                <Badge variant={riskScore > 30 ? 'destructive' : riskScore > 10 ? 'secondary' : 'default'}>
                  {riskLevel}
                </Badge>
              </div>
              <div className="relative">
                <Progress value={(riskScore / maxRisk) * 100} className="h-3" />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(riskScore / maxRisk) * 100}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="absolute top-0 left-0 h-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                />
              </div>
            </div>

            <Separator />

            <div className="grid md:grid-cols-3 gap-4">
              {[
                { icon: Shield, label: 'SÃ©curitÃ©', count: categoryFindings.security.length, color: 'text-red-600 dark:text-red-400', bg: 'from-red-500 to-orange-500' },
                { icon: Zap, label: 'Performance', count: categoryFindings.performance.length, color: 'text-orange-600 dark:text-orange-400', bg: 'from-orange-500 to-yellow-500' },
                { icon: Code2, label: 'MaintenabilitÃ©', count: categoryFindings.maintainability.length, color: 'text-blue-600 dark:text-blue-400', bg: 'from-blue-500 to-purple-500' },
              ].map((category, index) => (
                <motion.div
                  key={category.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  whileHover={{ y: -4 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-gray-50 to-transparent dark:from-gray-800/50 dark:to-transparent border border-gray-200/50 dark:border-gray-700/50"
                >
                  <motion.div 
                    className={`p-2 rounded-lg bg-gradient-to-br ${category.bg}`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <category.icon className="h-5 w-5 text-white" />
                  </motion.div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {category.label}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {category.count} problÃ¨me(s) dÃ©tectÃ©(s)
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Top Findings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              Top {Math.min(10, analysis.findings.length)} Findings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.findings.slice(0, 10).map((finding, idx) => (
                <motion.div
                  key={finding.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + idx * 0.05 }}
                  whileHover={{ x: 4, scale: 1.01 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50 dark:to-transparent border border-gray-200/50 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                >
                  <motion.div 
                    className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-lg"
                    whileHover={{ scale: 1.2, rotate: 360 }}
                    transition={{ duration: 0.3 }}
                  >
                    {idx + 1}
                  </motion.div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {finding.title}
                      </span>
                      <Badge variant={finding.severity === 'BLOCKER' ? 'destructive' : finding.severity === 'WARN' ? 'secondary' : 'outline'}>
                        {finding.severity}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {finding.category}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-mono mb-2">
                      {finding.file}:{finding.line}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {finding.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <CardTitle>Recommandations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { icon: AlertCircle, title: 'Critique - Action immÃ©diate', desc: 'Corrigez les 2 problÃ¨mes de sÃ©curitÃ© BLOCKER avant de merger cette PR.', bg: 'from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30', border: 'border-red-200/50 dark:border-red-800/50', text: 'text-red-900 dark:text-red-100', iconColor: 'text-red-600 dark:text-red-400' },
                { icon: AlertTriangle, title: 'RecommandÃ©', desc: 'Ajoutez des tests unitaires et optimisez les requÃªtes de base de donnÃ©es.', bg: 'from-orange-50 to-yellow-50 dark:from-orange-950/30 dark:to-yellow-950/30', border: 'border-orange-200/50 dark:border-orange-800/50', text: 'text-orange-900 dark:text-orange-100', iconColor: 'text-orange-600 dark:text-orange-400' },
                { icon: Info, title: 'AmÃ©lioration', desc: 'AmÃ©liorez la documentation et remplacez les magic numbers par des constantes.', bg: 'from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30', border: 'border-blue-200/50 dark:border-blue-800/50', text: 'text-blue-900 dark:text-blue-100', iconColor: 'text-blue-600 dark:text-blue-400' },
              ].map((rec, index) => (
                <motion.div
                  key={rec.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  whileHover={{ x: 4 }}
                  className={`flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br ${rec.bg} border ${rec.border}`}
                >
                  <rec.icon className={`h-5 w-5 ${rec.iconColor} mt-0.5 flex-shrink-0`} />
                  <div>
                    <div className={`font-semibold ${rec.text} mb-1`}>
                      {rec.title}
                    </div>
                    <div className={`text-sm ${rec.text}`}>
                      {rec.desc}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Reviewer Decision Panel */}
      {isReviewer && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 backdrop-blur-xl border-2 border-purple-200/50 dark:border-purple-800/50">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full blur-3xl" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2 relative z-10">
                <Shield className="h-5 w-5 text-purple-500" />
                Decision Panel (Reviewer)
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="flex gap-3">
                {[
                  { label: 'Approve', icon: CheckCircle2, gradient: 'from-green-600 to-emerald-600' },
                  { label: 'Approve with warnings', icon: AlertTriangle, gradient: 'from-orange-500 to-yellow-500' },
                  { label: 'Block', icon: XCircle, gradient: 'from-red-600 to-orange-600' },
                ].map((action, index) => (
                  <motion.div
                    key={action.label}
                    className="flex-1"
                    whileHover={{ scale: 1.05, y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                  >
                    <Button className={`w-full gap-2 bg-gradient-to-r ${action.gradient} hover:shadow-lg shadow-md`}>
                      <action.icon className="h-4 w-4" />
                      {action.label}
                    </Button>
                  </motion.div>
                ))}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-4 text-center">
                Cette dÃ©cision sera enregistrÃ©e et notifiÃ©e Ã  l'auteur de la PR
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
