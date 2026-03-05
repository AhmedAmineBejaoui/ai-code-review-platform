"use client";
/* eslint-disable react/no-unescaped-entities */

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Trash2, Edit, Shield, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

const mockUsers = [
  {
    id: '1',
    name: 'Sophie Martin',
    email: 'sophie.martin@company.com',
    role: 'reviewer',
    avatar: 'SM',
    permissions: ['override_severity', 'trigger_rerun'],
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    id: '2',
    name: 'Jean Dupont',
    email: 'jean.dupont@company.com',
    role: 'dev',
    avatar: 'JD',
    permissions: ['trigger_rerun'],
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: '3',
    name: 'Marie Laurent',
    email: 'marie.laurent@company.com',
    role: 'dev',
    avatar: 'ML',
    permissions: ['trigger_rerun'],
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    id: '4',
    name: 'Admin User',
    email: 'admin@company.com',
    role: 'admin',
    avatar: 'AU',
    permissions: ['manage_kb', 'override_severity', 'trigger_rerun'],
    gradient: 'from-red-500 to-orange-500',
  },
];

const allPermissions = [
  { id: 'manage_kb', label: 'GÃ©rer la base de connaissance', gradient: 'from-emerald-500 to-teal-500' },
  { id: 'override_severity', label: 'Modifier la sÃ©vÃ©ritÃ©', gradient: 'from-orange-500 to-red-500' },
  { id: 'trigger_rerun', label: 'Relancer une analyse', gradient: 'from-blue-500 to-purple-500' },
];

export function UserManagement() {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const getRoleBadge = (role: string) => {
    const variants: Record<string, any> = {
      admin: 'destructive',
      reviewer: 'secondary',
      dev: 'outline',
    };
    return <Badge variant={variants[role]}>{role}</Badge>;
  };

  const stats = [
    { label: 'Total utilisateurs', value: mockUsers.length, icon: Users, gradient: 'from-blue-500 to-cyan-500' },
    { label: 'Admins', value: mockUsers.filter(u => u.role === 'admin').length, icon: Shield, gradient: 'from-red-500 to-orange-500' },
    { label: 'Reviewers', value: mockUsers.filter(u => u.role === 'reviewer').length, icon: Shield, gradient: 'from-orange-500 to-yellow-500' },
    { label: 'DÃ©veloppeurs', value: mockUsers.filter(u => u.role === 'dev').length, icon: Users, gradient: 'from-green-500 to-emerald-500' },
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 dark:from-white dark:via-indigo-100 dark:to-purple-100 bg-clip-text text-transparent mb-2 flex items-center gap-3">
            <Users className="h-10 w-10 text-indigo-500" />
            Gestion des utilisateurs
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestion des accÃ¨s et permissions (RBAC)
          </p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
            <Plus className="h-4 w-4" />
            Ajouter utilisateur
          </Button>
        </motion.div>
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
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
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

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <CardTitle>Utilisateurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>RÃ´le</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockUsers.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.05 }}
                      className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <motion.div whileHover={{ scale: 1.1 }}>
                            <Avatar className="ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 ring-transparent group-hover:ring-blue-500/50 transition-all">
                              <AvatarFallback className={`bg-gradient-to-br ${user.gradient} text-white font-semibold`}>
                                {user.avatar}
                              </AvatarFallback>
                            </Avatar>
                          </motion.div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        {user.email}
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.permissions.map((perm) => (
                            <Badge key={perm} variant="outline" className="text-xs">
                              {perm}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {[
                            { icon: Edit, color: 'text-blue-600', action: () => setSelectedUser(user.id) },
                            { icon: Shield, color: 'text-purple-600', action: () => {} },
                            { icon: Trash2, color: 'text-red-600', action: () => {} },
                          ].map((action, idx) => (
                            <motion.div
                              key={idx}
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Button variant="ghost" size="icon" onClick={action.action}>
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

      {/* Permissions Detail */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Permissions disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allPermissions.map((permission, index) => (
                <motion.div
                  key={permission.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  whileHover={{ x: 4 }}
                  className={`flex items-center justify-between p-4 rounded-xl bg-gradient-to-r ${permission.gradient} bg-opacity-5 border border-gray-200/50 dark:border-gray-700/50`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${permission.gradient}`}>
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {permission.label}
                      </span>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Permission ID:{' '}
                        <code className="bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs border border-gray-200 dark:border-gray-700">
                          {permission.id}
                        </code>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {mockUsers.filter((u) => u.permissions.includes(permission.id)).length} utilisateur(s)
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Token Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 backdrop-blur-xl border-purple-200/50 dark:border-purple-800/50">
          <CardHeader>
            <CardTitle>Gestion des tokens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              GÃ©rez les tokens d'accÃ¨s API pour les utilisateurs et les intÃ©grations CI/CD.
            </p>
            <div className="flex gap-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" className="bg-white dark:bg-gray-800">
                  GÃ©nÃ©rer nouveau token
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" className="bg-white dark:bg-gray-800">
                  RÃ©voquer tous les tokens
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
