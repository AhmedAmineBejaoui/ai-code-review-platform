"use client";
/* eslint-disable react/no-unescaped-entities */


import { motion } from "framer-motion";
import { ExternalLink, AlertCircle, Star, BookOpen, Sparkles } from "lucide-react";
import { mockRagSources } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export function RagCitations() {

  return (
    <motion.div 
      className="max-w-4xl mx-auto space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent mb-2">
          Citations RAG
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Sources utilisÃ©es par l'IA pour gÃ©nÃ©rer les recommandations
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 backdrop-blur-xl border-blue-200/50 dark:border-blue-800/50">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl" />
          <CardContent className="pt-6 relative z-10">
            <div className="flex items-start gap-3">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </motion.div>
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Ã€ propos des citations RAG
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Ces extraits proviennent de la base de connaissances et ont Ã©tÃ© utilisÃ©s pour
                  contextualiser les recommandations de l'IA. Le score de pertinence indique
                  la correspondance entre le document et le problÃ¨me dÃ©tectÃ©.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="space-y-4">
        {mockRagSources.map((source, index) => (
          <motion.div
            key={source.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
          >
            <Card className="group bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50 hover:border-blue-300 dark:hover:border-blue-700 transition-all overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {source.title}
                      <motion.a
                        href={source.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.2, rotate: 45 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </motion.a>
                    </CardTitle>
                    <div className="flex items-center gap-3 mt-3 text-sm text-gray-600 dark:text-gray-400">
                      <Badge variant="outline" className="text-xs">
                        {source.section}
                      </Badge>
                      <span>
                        {new Date(source.date).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <motion.div 
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30"
                      whileHover={{ scale: 1.05 }}
                    >
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {(source.score * 100).toFixed(0)}%
                      </span>
                    </motion.div>
                    <div className="w-32">
                      <Progress value={source.score * 100} className="h-2" />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <motion.div 
                  className="bg-gradient-to-r from-gray-50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-950/30 p-4 rounded-xl border-l-4 border-blue-500 mb-4"
                  whileHover={{ x: 4 }}
                >
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                    {source.excerpt}
                  </p>
                </motion.div>
                <div className="flex gap-2">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <ExternalLink className="h-3 w-3" />
                      Ouvrir document
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <AlertCircle className="h-3 w-3" />
                      Signaler obsolÃ¨te
                    </Button>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <CardTitle className="text-base">Sources supplÃ©mentaires consultÃ©es</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {[
                { title: 'React Security Best Practices', score: 0.72 },
                { title: 'Database Query Optimization Guide', score: 0.68 },
                { title: 'TypeScript Error Handling Patterns', score: 0.65 },
              ].map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  whileHover={{ x: 4 }}
                  className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                      {item.title}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      score: {(item.score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm">Voir</Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
