"use client"

import { useState, useEffect } from "react"
import { SeniorReviewInterface } from "./SeniorReviewInterface"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Crown, Users, UserPlus, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface LeadReviewInterfaceProps {
  analysisId: string
  assignmentId?: string
}

export function LeadReviewInterface({ analysisId, assignmentId }: LeadReviewInterfaceProps) {
  const [showReassign, setShowReassign] = useState(false)
  const [selectedReviewer, setSelectedReviewer] = useState("")

  // Mock team members
  const teamMembers = [
    { id: "rev_001", name: "Alice Chen", role: "Senior Reviewer", availability: "available", current_reviews: 2 },
    { id: "rev_002", name: "Bob Smith", role: "Junior Reviewer", availability: "available", current_reviews: 1 },
    { id: "rev_003", name: "Carol Davis", role: "Senior Reviewer", availability: "busy", current_reviews: 5 },
    { id: "rev_004", name: "David Lee", role: "Junior Reviewer", availability: "available", current_reviews: 3 },
  ]

  const handleReassign = async () => {
    if (!selectedReviewer) return
    
    const reviewer = teamMembers.find(m => m.id === selectedReviewer)
    await new Promise(resolve => setTimeout(resolve, 500))
    alert(`✅ Review reassigned to ${reviewer?.name}!\n\nThey will be notified immediately.`)
    setShowReassign(false)
  }

  return (
    <div className="space-y-6">
      {/* Lead Reviewer Enhanced Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="h-6 w-6 text-amber-600" />
                <div>
                  <div className="flex items-center gap-2">
                    <span>Lead Reviewer Tools</span>
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-none">
                      Full Access
                    </Badge>
                  </div>
                  <p className="text-sm font-normal text-gray-600 dark:text-gray-400 mt-1">
                    Team management, reassignment, and override capabilities
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReassign(!showReassign)}
                className="ml-4"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {showReassign ? "Hide" : "Reassign"}
              </Button>
            </CardTitle>
          </CardHeader>
          
          {showReassign && (
            <CardContent className="border-t border-amber-200 dark:border-amber-800 pt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Reassign This Review
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Transfer this review to another team member
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      onClick={() => setSelectedReviewer(member.id)}
                      className={`
                        p-3 rounded-lg border-2 cursor-pointer transition-all
                        ${selectedReviewer === member.id 
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30" 
                          : "border-gray-200 dark:border-gray-700 hover:border-amber-300"
                        }
                        ${member.availability === "busy" ? "opacity-60" : ""}
                      `}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{member.name}</span>
                        <Badge 
                          variant="outline" 
                          className={member.availability === "available" ? "text-green-600" : "text-yellow-600"}
                        >
                          {member.availability}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {member.role} • {member.current_reviews} active reviews
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleReassign}
                  disabled={!selectedReviewer}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Reassign Review
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* Inherit all Senior Reviewer capabilities */}
      <SeniorReviewInterface 
        analysisId={analysisId} 
        assignmentId={assignmentId}
      />
    </div>
  )
}
