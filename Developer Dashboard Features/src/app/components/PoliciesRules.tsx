import { useState } from "react";
import { motion } from "motion/react";
import { Shield, Save, TestTube, History, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Slider } from "./ui/slider";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function PoliciesRules() {
  const [maxComments, setMaxComments] = useState([50]);
  const [failOnBlocker, setFailOnBlocker] = useState(true);

  const categories = [
    { id: 'security', label: 'Security', desc: 'Vulnérabilités et problèmes de sécurité', gradient: 'from-red-500 to-orange-500' },
    { id: 'performance', label: 'Performance', desc: 'Optimisations et goulots d\'étranglement', gradient: 'from-orange-500 to-yellow-500' },
    { id: 'quality', label: 'Quality', desc: 'Bonnes pratiques et qualité du code', gradient: 'from-blue-500 to-cyan-500' },
    { id: 'maintainability', label: 'Maintainability', desc: 'Maintenabilité et lisibilité du code', gradient: 'from-purple-500 to-pink-500' },
  ];

  return (
    <motion.div 
      className="max-w-4xl mx-auto space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div 
        className="flex justify-between items-start"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-orange-900 to-red-900 dark:from-white dark:via-orange-100 dark:to-red-100 bg-clip-text text-transparent mb-2 flex items-center gap-3">
            <Shield className="h-10 w-10 text-orange-500" />
            Policies & Rules
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configuration des règles d'analyse
          </p>
        </div>
        <div className="flex gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button variant="outline" className="gap-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl">
              <History className="h-4 w-4" />
              Historique
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button className="gap-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700">
              <Save className="h-4 w-4" />
              Sauvegarder
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Severity Thresholds */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Seuils de sévérité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <motion.div 
              className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50 dark:to-transparent border border-gray-200/50 dark:border-gray-700/50"
              whileHover={{ x: 4 }}
            >
              <div className="space-y-1">
                <Label className="text-base">Fail CI sur BLOCKER</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Bloquer la PR si des problèmes BLOCKER sont détectés
                </p>
              </div>
              <motion.div whileTap={{ scale: 0.9 }}>
                <Switch checked={failOnBlocker} onCheckedChange={setFailOnBlocker} />
              </motion.div>
            </motion.div>

            <div className="space-y-3">
              <Label className="text-base">Nombre maximum de commentaires par PR</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={maxComments}
                  onValueChange={setMaxComments}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <motion.span 
                  className="text-sm font-semibold w-12 text-right px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                  key={maxComments[0]}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                >
                  {maxComments[0]}
                </motion.span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Limite le nombre de commentaires pour éviter de surcharger la PR
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Active Categories */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <CardTitle>Catégories actives</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                whileHover={{ x: 4 }}
                className={`flex items-center justify-between p-4 rounded-xl bg-gradient-to-r ${category.gradient} bg-opacity-5 border border-gray-200/50 dark:border-gray-700/50`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${category.gradient}`}>
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-base">{category.label}</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {category.desc}
                    </p>
                  </div>
                </div>
                <motion.div whileTap={{ scale: 0.9 }}>
                  <Switch defaultChecked />
                </motion.div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* File Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <CardTitle>Filtres de fichiers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Chemins ignorés (glob patterns)</Label>
              <Textarea
                placeholder="Ex: vendor/**&#10;node_modules/**&#10;**/*.test.ts"
                className="mt-2 font-mono text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                rows={5}
                defaultValue="vendor/**&#10;node_modules/**&#10;dist/**&#10;build/**"
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Un pattern par ligne. Les fichiers correspondants seront ignorés lors de l'analyse.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Repository-specific Rules */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 backdrop-blur-xl border-blue-200/50 dark:border-blue-800/50">
          <CardHeader>
            <CardTitle>Règles par repository</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Repository</Label>
                <Select defaultValue="backend-api">
                  <SelectTrigger className="mt-2 bg-white dark:bg-gray-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backend-api">backend-api</SelectItem>
                    <SelectItem value="frontend-app">frontend-app</SelectItem>
                    <SelectItem value="mobile-app">mobile-app</SelectItem>
                    <SelectItem value="data-pipeline">data-pipeline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Profil de sévérité</Label>
                <Select defaultValue="strict">
                  <SelectTrigger className="mt-2 bg-white dark:bg-gray-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strict">Strict (production)</SelectItem>
                    <SelectItem value="moderate">Modéré</SelectItem>
                    <SelectItem value="relaxed">Détendu (dev)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="outline" size="sm" className="bg-white dark:bg-gray-800">
                Ajouter règle spécifique
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Test Policy */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-emerald-500" />
              Tester la policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>PR ou commit de test</Label>
              <Input 
                placeholder="Ex: PR #456 ou commit a3f2c1d" 
                className="mt-2 bg-white dark:bg-gray-800"
              />
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                <TestTube className="h-4 w-4" />
                Lancer test
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
