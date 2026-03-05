import { useState } from "react";
import { motion } from "motion/react";
import { 
  Database, 
  RefreshCw, 
  Trash2, 
  Edit, 
  Search,
  Upload,
  Plus,
  Sparkles,
} from "lucide-react";
import { mockKbDocuments } from "../data/mockData";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState("");

  const stats = [
    { label: 'Documents', value: mockKbDocuments.length, icon: Database, gradient: 'from-blue-500 to-cyan-500' },
    { label: 'Chunks totaux', value: mockKbDocuments.reduce((acc, doc) => acc + doc.chunks, 0), icon: Database, gradient: 'from-green-500 to-emerald-500' },
    { label: 'Indexés', value: mockKbDocuments.filter(d => d.status === 'indexed').length, icon: Database, gradient: 'from-purple-500 to-pink-500' },
    { label: 'Obsolètes', value: mockKbDocuments.filter(d => d.status === 'outdated').length, icon: Database, gradient: 'from-orange-500 to-red-500' },
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-emerald-900 to-teal-900 dark:from-white dark:via-emerald-100 dark:to-teal-100 bg-clip-text text-transparent mb-2 flex items-center gap-3">
            <Database className="h-10 w-10 text-emerald-500" />
            Base de Connaissance
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestion des documents utilisés par le RAG
          </p>
        </div>
        <div className="flex gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button variant="outline" className="gap-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl">
              <Upload className="h-4 w-4" />
              Importer
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
              <Plus className="h-4 w-4" />
              Ajouter source
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            whileHover={{ y: -4, scale: 1.02 }}
          >
            <Card className="relative overflow-hidden bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.gradient} opacity-20 rounded-full blur-2xl`} />
              <CardContent className="pt-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent">
                      {stat.value}
                    </p>
                  </div>
                  <motion.div 
                    className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient}`}
                    whileHover={{ scale: 1.1, rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    <stat.icon className="h-6 w-6 text-white" />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Ingestion Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 backdrop-blur-xl border-emerald-200/50 dark:border-emerald-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              Paramètres d'ingestion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block font-medium">
                  Type d'ingestion
                </label>
                <Select defaultValue="incremental">
                  <SelectTrigger className="bg-white dark:bg-gray-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full (complète)</SelectItem>
                    <SelectItem value="incremental">Incremental</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <motion.div 
                  className="w-full"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button className="w-full gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                    <RefreshCw className="h-4 w-4" />
                    Lancer re-indexation
                  </Button>
                </motion.div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Documents List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <div className="flex items-center gap-4">
              <CardTitle className="flex-1">Documents indexés</CardTitle>
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un document..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white dark:bg-gray-800"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                    <TableHead>Titre</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Dernière indexation</TableHead>
                    <TableHead>Chunks</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockKbDocuments.map((doc, index) => (
                    <motion.tr
                      key={doc.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.05 }}
                      className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <TableCell className="font-medium text-gray-900 dark:text-white">
                        {doc.title}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        {doc.source}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400 text-sm">
                        {new Date(doc.lastIndexed).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.chunks}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={doc.status === 'indexed' ? 'default' : 'secondary'}>
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {[
                            { icon: Edit, color: 'text-blue-600' },
                            { icon: RefreshCw, color: 'text-purple-600' },
                            { icon: Search, color: 'text-emerald-600' },
                            { icon: Trash2, color: 'text-red-600' },
                          ].map((action, idx) => (
                            <motion.div
                              key={idx}
                              whileHover={{ scale: 1.2, rotate: action.icon === RefreshCw ? 180 : 0 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Button variant="ghost" size="icon">
                                <action.icon className={`h-4 w-4 ${action.color}`} />
                              </Button>
                            </motion.div>
                          ))}
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

      {/* Test Retrieval */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <CardTitle>Tester le retrieval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                  Entrez une requête pour tester la recherche RAG
                </label>
                <Input 
                  placeholder="Ex: SQL injection prevention" 
                  className="bg-white dark:bg-gray-800"
                />
              </div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Search className="h-4 w-4" />
                  Tester
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
