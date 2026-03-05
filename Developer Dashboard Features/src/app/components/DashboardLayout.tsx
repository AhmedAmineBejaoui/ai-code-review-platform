import { Outlet, Link, useLocation } from "react-router";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "motion/react";
import { 
  LayoutDashboard, 
  List, 
  Shield, 
  Database,
  Users,
  Activity,
  Plug,
  Moon,
  Sun,
  Settings,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { currentUser } from "../data/mockData";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function DashboardLayout() {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  
  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, gradient: 'from-blue-500 to-cyan-500' },
    { name: 'Analyses', href: '/analyses', icon: List, gradient: 'from-purple-500 to-pink-500' },
  ];

  const adminNavigation = [
    { name: 'Base de Connaissance', href: '/admin/knowledge-base', icon: Database, gradient: 'from-emerald-500 to-teal-500' },
    { name: 'Policies & Rules', href: '/admin/policies', icon: Shield, gradient: 'from-orange-500 to-red-500' },
    { name: 'Utilisateurs', href: '/admin/users', icon: Users, gradient: 'from-indigo-500 to-purple-500' },
    { name: 'Observabilité', href: '/admin/observability', icon: Activity, gradient: 'from-pink-500 to-rose-500' },
    { name: 'Intégrations', href: '/admin/integrations', icon: Plug, gradient: 'from-cyan-500 to-blue-500' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'reviewer';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-950 dark:via-blue-950/30 dark:to-purple-950/20">
      {/* Modern Sidebar */}
      <motion.aside 
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        className="fixed left-0 top-0 h-screen w-[280px] border-r border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl z-50"
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <motion.div 
            className="p-6 border-b border-gray-200/50 dark:border-gray-800/50"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Link to="/" className="flex items-center gap-3 group">
              <motion.div 
                className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <Sparkles className="h-5 w-5 text-white" />
                <motion.div 
                  className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 opacity-0 group-hover:opacity-100 blur-xl transition-opacity"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 0.6 }}
                />
              </motion.div>
              <div>
                <h1 className="font-bold text-lg bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  AI Review
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Code Intelligence</p>
              </div>
            </Link>
          </motion.div>

          {/* Main Navigation */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {navigation.map((item, index) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link key={item.name} to={item.href}>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative"
                    >
                      {active && (
                        <motion.div
                          layoutId="activeNav"
                          className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 rounded-xl"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                      <div className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        active 
                          ? 'text-gray-900 dark:text-white' 
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}>
                        <motion.div 
                          className={`relative p-2 rounded-lg ${
                            active 
                              ? `bg-gradient-to-br ${item.gradient}` 
                              : 'bg-gray-100 dark:bg-gray-800'
                          }`}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                        >
                          <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
                        </motion.div>
                        <span className="font-medium text-sm">{item.name}</span>
                        {active && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="ml-auto"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  </Link>
                );
              })}
            </motion.div>

            {/* Admin Section */}
            {isAdmin && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="pt-6"
              >
                <div className="px-4 mb-2">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Administration
                  </p>
                </div>
                {adminNavigation.map((item, index) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link key={item.name} to={item.href}>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * (index + 2) }}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className="relative"
                      >
                        {active && (
                          <motion.div
                            layoutId="activeNav"
                            className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 rounded-xl"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}
                        <div className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                          active 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}>
                          <motion.div 
                            className={`relative p-2 rounded-lg ${
                              active 
                                ? `bg-gradient-to-br ${item.gradient}` 
                                : 'bg-gray-100 dark:bg-gray-800'
                            }`}
                            whileHover={{ scale: 1.1, rotate: 5 }}
                          >
                            <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
                          </motion.div>
                          <span className="font-medium text-sm">{item.name}</span>
                          {active && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="ml-auto"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </div>

          {/* Bottom Section */}
          <motion.div 
            className="p-3 border-t border-gray-200/50 dark:border-gray-800/50 space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {/* Theme Toggle */}
            <motion.button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.div 
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800"
                whileHover={{ scale: 1.1, rotate: 180 }}
                transition={{ duration: 0.3 }}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </motion.div>
              <span className="font-medium text-sm">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </motion.button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Avatar className="h-8 w-8 ring-2 ring-blue-500/20">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                      {currentUser.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {currentUser.role}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{currentUser.name}</span>
                    <span className="text-xs text-gray-500">{currentUser.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Préférences
                </DropdownMenuItem>
                <DropdownMenuItem>Déconnexion</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="ml-[280px] min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="p-8"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
