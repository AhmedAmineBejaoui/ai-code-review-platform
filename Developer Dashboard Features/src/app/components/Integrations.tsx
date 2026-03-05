import { useState } from "react";
import { motion } from "motion/react";
import { Plug, CheckCircle2, XCircle, RotateCw, Key, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

export function Integrations() {
  const [githubConnected, setGithubConnected] = useState(true);
  const [gitlabConnected, setGitlabConnected] = useState(false);
  const [ciEnabled, setCiEnabled] = useState(true);

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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-cyan-900 to-blue-900 dark:from-white dark:via-cyan-100 dark:to-blue-100 bg-clip-text text-transparent mb-2 flex items-center gap-3">
            <Plug className="h-10 w-10 text-cyan-500" />
            Intégrations
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configuration Git, CI et stockage
          </p>
        </div>
      </motion.div>

      {/* Git Providers */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <CardTitle>Git Providers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <motion.div 
              className="flex items-start justify-between p-6 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200/50 dark:border-gray-700/50 group hover:border-gray-300 dark:hover:border-gray-600 transition-all"
              whileHover={{ x: 4 }}
            >
              <div className="flex items-start gap-4">
                <motion.div 
                  className="w-14 h-14 bg-gray-900 dark:bg-white rounded-xl flex items-center justify-center shadow-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <svg className="w-8 h-8 text-white dark:text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </motion.div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-xl text-gray-900 dark:text-white">GitHub</span>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      {githubConnected ? (
                        <Badge className="gap-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                          <CheckCircle2 className="h-3 w-3" />
                          Connecté
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Non connecté
                        </Badge>
                      )}
                    </motion.div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    GitHub App installée • 3 organisations • 12 repositories
                  </p>
                  <Badge variant="outline" className="text-xs">Webhooks actifs</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <RotateCw className="h-3 w-3" />
                    Tester
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" size="sm">
                    Configurer
                  </Button>
                </motion.div>
              </div>
            </motion.div>

            <motion.div 
              className="flex items-start justify-between p-6 rounded-xl bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border border-orange-200/50 dark:border-orange-800/50 opacity-60"
              whileHover={{ opacity: 1, x: 4 }}
            >
              <div className="flex items-start gap-4">
                <motion.div 
                  className="w-14 h-14 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center shadow-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.546 10.93L13.067.452c-.604-.603-1.582-.603-2.188 0L8.708 2.627l2.76 2.76c.645-.215 1.379-.07 1.889.441.516.515.658 1.258.438 1.9l2.658 2.66c.645-.223 1.387-.078 1.9.435.721.72.721 1.884 0 2.604-.719.719-1.881.719-2.6 0-.539-.541-.674-1.337-.404-1.996L12.86 8.955v6.525c.176.086.342.203.488.348.713.721.713 1.883 0 2.6-.719.721-1.889.721-2.609 0-.719-.719-.719-1.879 0-2.598.182-.181.387-.317.605-.406V8.835c-.217-.088-.424-.222-.6-.401-.545-.545-.676-1.342-.396-2.009L7.636 3.7.45 10.881c-.6.605-.6 1.584 0 2.189l10.48 10.477c.604.604 1.582.604 2.186 0l10.43-10.43c.605-.603.605-1.582 0-2.187"/>
                  </svg>
                </motion.div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-xl text-gray-900 dark:text-white">GitLab</span>
                    <Badge variant="outline" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Non connecté
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Connectez votre instance GitLab
                  </p>
                </div>
              </div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" size="sm">
                  Connecter
                </Button>
              </motion.div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* CI Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 backdrop-blur-xl border-blue-200/50 dark:border-blue-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Configuration CI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <motion.div 
              className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-gray-900/50 border border-blue-200/50 dark:border-blue-800/50"
              whileHover={{ x: 4 }}
            >
              <div className="space-y-1">
                <Label className="text-base">Intégration CI active</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Analyser automatiquement les PRs via CI/CD
                </p>
              </div>
              <motion.div whileTap={{ scale: 0.9 }}>
                <Switch checked={ciEnabled} onCheckedChange={setCiEnabled} />
              </motion.div>
            </motion.div>

            <div>
              <Label>Token API pour CI</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="password"
                  value="sk_live_xxxxxxxxxxxxxxxxxxxx"
                  readOnly
                  className="font-mono text-sm bg-white dark:bg-gray-800"
                />
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Key className="h-3 w-3" />
                    Rotation
                  </Button>
                </motion.div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Utilisez ce token dans votre pipeline CI pour appeler{' '}
                <code className="bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-xs">
                  /analyze/ci
                </code>
              </p>
            </div>

            <motion.div 
              className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-gray-900/50 border border-blue-200/50 dark:border-blue-800/50"
              whileHover={{ x: 4 }}
            >
              <div className="space-y-1">
                <Label className="text-base">Fail on BLOCKER</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Faire échouer le build CI si des BLOCKER sont détectés
                </p>
              </div>
              <motion.div whileTap={{ scale: 0.9 }}>
                <Switch defaultChecked />
              </motion.div>
            </motion.div>

            <div className="p-4 bg-white dark:bg-gray-900/50 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Exemple d'intégration GitHub Actions
              </p>
              <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto border border-gray-200 dark:border-gray-700">
                <code className="text-gray-800 dark:text-gray-200">{`- name: AI Code Review
  uses: company/ai-code-review-action@v1
  with:
    token: \${{ secrets.AI_REVIEW_TOKEN }}
    fail-on-blocker: true`}</code>
              </pre>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Storage */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <CardTitle>Stockage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Provider de stockage</Label>
              <Input 
                value="S3 Compatible (MinIO)" 
                readOnly 
                className="mt-2 bg-white dark:bg-gray-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Endpoint</Label>
                <Input 
                  value="https://minio.company.internal" 
                  readOnly 
                  className="mt-2 bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <Label>Bucket</Label>
                <Input 
                  value="ai-code-review-artifacts" 
                  readOnly 
                  className="mt-2 bg-white dark:bg-gray-800"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" className="gap-2">
                  <RotateCw className="h-3 w-3" />
                  Tester connexion
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline">
                  Configurer
                </Button>
              </motion.div>
            </div>

            <motion.div 
              className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border border-green-200/50 dark:border-green-800/50 flex items-start gap-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-green-800 dark:text-green-200">
                Connexion vérifiée avec succès • Dernière vérification: il y a 2 minutes
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Webhooks Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <CardTitle>Statut des webhooks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { repo: 'github.com/company/backend-api', event: 'PR opened', time: '2 heures' },
                { repo: 'github.com/company/frontend-app', event: 'PR synchronize', time: '1 heure' },
              ].map((webhook, index) => (
                <motion.div
                  key={webhook.repo}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  whileHover={{ x: 4 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50 dark:to-transparent border border-gray-200/50 dark:border-gray-700/50"
                >
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2, delay: index * 0.5 }}
                    >
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </motion.div>
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {webhook.repo}
                      </span>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Dernier événement: {webhook.event} • Il y a {webhook.time}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                    Actif
                  </Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
