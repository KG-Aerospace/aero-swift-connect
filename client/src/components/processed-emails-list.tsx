import { useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Mail, Calendar, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProcessedEmailsListProps {
  emails: any[];
}

export function ProcessedEmailsList({ emails }: ProcessedEmailsListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const totalPages = Math.ceil(emails.length / itemsPerPage);
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEmails = emails.slice(startIndex, endIndex);

  if (emails.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          No processed emails
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-semibold">
          Processed Emails ({emails.length} total)
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {currentEmails.map((email) => (
              <div
                key={email.id}
                className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-start gap-3 flex-1">
                  <Mail className="h-4 w-4 text-gray-400 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm truncate">
                          {email.subject}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span className="truncate max-w-[200px]">
                              {email.fromEmail}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {format(new Date(email.receivedAt), "MMM dd, HH:mm")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {email.attachments?.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {email.attachments.length} files
                          </Badge>
                        )}
                        <Badge 
                          variant="secondary"
                          className="text-xs bg-green-50 text-green-700"
                        >
                          Processed
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm px-4">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            Last
          </Button>
        </div>
      )}
    </div>
  );
}