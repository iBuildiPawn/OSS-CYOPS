"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings, Trash2, Scan, Download, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface IntegrationConfig {
  id: string;
  name: string;
  type: string;
  active: boolean;
  base_url: string;
  created_at: string;
  last_sync_at?: string;
}

interface IntegrationConfigManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: string;
  configs: IntegrationConfig[];
  onToggle: (id: string, active: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onBrowseScans?: (id: string, name: string) => void;
  isToggling?: boolean;
}

export function IntegrationConfigManager({
  open,
  onOpenChange,
  vendor,
  configs,
  onToggle,
  onEdit,
  onDelete,
  onBrowseScans,
  isToggling = false,
}: IntegrationConfigManagerProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleDeleteClick = (config: IntegrationConfig) => {
    setConfigToDelete({ id: config.id, name: config.name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (configToDelete) {
      onDelete(configToDelete.id);
      setDeleteDialogOpen(false);
      setConfigToDelete(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{vendor} Configurations</DialogTitle>
            <DialogDescription>
              Manage your {vendor} API integrations and connections
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {configs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No configurations found</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {configs.map((config) => (
                  <Card key={config.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-base">
                              {config.name}
                            </CardTitle>
                            {config.active ? (
                              <Badge variant="default" className="text-xs">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="text-sm">
                            {config.base_url}
                          </CardDescription>
                          {config.last_sync_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Last synced:{" "}
                              {new Date(config.last_sync_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <Switch
                          checked={config.active}
                          onCheckedChange={(checked) =>
                            onToggle(config.id, checked)
                          }
                          disabled={isToggling}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {/* Action Buttons */}
                        {onBrowseScans && (
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                onBrowseScans(config.id, config.name)
                              }
                              disabled={!config.active}
                            >
                              <Scan className="h-4 w-4 mr-2" />
                              Browse Scans
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                onBrowseScans(config.id, config.name)
                              }
                              disabled={!config.active}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Import
                            </Button>
                          </div>
                        )}

                        {/* Settings & Delete */}
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1"
                            onClick={() => onEdit(config.id)}
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Edit Settings
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteClick(config)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{configToDelete?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
