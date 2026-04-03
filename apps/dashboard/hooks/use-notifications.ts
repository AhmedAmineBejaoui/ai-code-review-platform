"use client"

import { useState, useEffect, useCallback } from "react"
import { Notification } from "@/components/ui/notification-popover"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

interface UseNotificationsOptions {
  userId?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { userId, autoRefresh = true, refreshInterval = 30000 } = options
  
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/notifications`, {
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Transform backend data to frontend format
      const transformedNotifications: Notification[] = (data.notifications || []).map((n: any) => ({
        id: n.id,
        type: mapNotificationType(n.type),
        title: n.title,
        message: n.message,
        timestamp: n.created_at || new Date().toISOString(),
        status: n.read ? "read" : "unread",
        actionUrl: n.data?.url,
        actionLabel: n.data?.actionLabel,
        metadata: n.data,
      }))
      
      setNotifications(transformedNotifications)
      setError(null)
    } catch (err) {
      console.error("Failed to fetch notifications:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [userId])
  
  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await fetch(`${BACKEND_URL}/api/v1/notifications/${notificationId}/read`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })
      
      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, status: "read" as const } : n
        )
      )
    } catch (err) {
      console.error("Failed to mark notification as read:", err)
    }
  }, [])
  
  // Archive notification
  const archiveNotification = useCallback(async (notificationId: string) => {
    try {
      await fetch(`${BACKEND_URL}/api/v1/notifications/${notificationId}/archive`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })
      
      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, status: "archived" as const } : n
        )
      )
    } catch (err) {
      console.error("Failed to archive notification:", err)
    }
  }, [])
  
  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await fetch(`${BACKEND_URL}/api/v1/notifications/${notificationId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })
      
      // Update local state
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    } catch (err) {
      console.error("Failed to delete notification:", err)
    }
  }, [])
  
  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await fetch(`${BACKEND_URL}/api/v1/notifications/read-all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })
      
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, status: n.status === "unread" ? "read" as const : n.status }))
      )
    } catch (err) {
      console.error("Failed to mark all as read:", err)
    }
  }, [])
  
  // Clear all notifications
  const clearAll = useCallback(async () => {
    try {
      await fetch(`${BACKEND_URL}/api/v1/notifications`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })
      
      // Update local state
      setNotifications([])
    } catch (err) {
      console.error("Failed to clear all notifications:", err)
    }
  }, [])
  
  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])
  
  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !userId) return
    
    const interval = setInterval(() => {
      fetchNotifications()
    }, refreshInterval)
    
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchNotifications, userId])
  
  return {
    notifications,
    loading,
    error,
    refetch: fetchNotifications,
    markAsRead,
    archiveNotification,
    deleteNotification,
    markAllAsRead,
    clearAll,
  }
}

// Helper function to map backend notification types to frontend types
function mapNotificationType(backendType: string): "info" | "success" | "warning" | "error" {
  const typeMap: Record<string, "info" | "success" | "warning" | "error"> = {
    review_assigned: "info",
    review_completed: "success",
    changes_requested: "warning",
    review_approved: "success",
    attention_required: "warning",
    analysis_completed: "success",
    analysis_failed: "error",
    comment_reply: "info",
    mention: "info",
  }
  
  return typeMap[backendType] || "info"
}
