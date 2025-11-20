"use client";

import { Edit, Loader2, Search, Server, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAffectedSystems,
  useDeleteAffectedSystem,
} from "@/hooks/use-affected-systems";
import type { AffectedSystem } from "@/types/vulnerability";

interface AffectedSystemListProps {
  onEdit?: (system: AffectedSystem) => void;
  onSelect?: (system: AffectedSystem) => void;
  selectable?: boolean;
}

export function AffectedSystemList({
  onEdit,
  onSelect,
  selectable = false,
}: AffectedSystemListProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [environmentFilter, setEnvironmentFilter] = useState<string>("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading, error } = useAffectedSystems({
    search: search || undefined,
    type: typeFilter || undefined,
    environment: environmentFilter || undefined,
  });

  const deleteMutation = useDeleteAffectedSystem();

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("System deleted successfully");
      setDeleteId(null);
    } catch (error) {
      toast.error("Failed to delete system");
    }
  };

  const typeOptions = [
    { value: "", label: "All Types" },
    { value: "SERVER", label: "Server" },
    { value: "WORKSTATION", label: "Workstation" },
    { value: "NETWORK_DEVICE", label: "Network Device" },
    { value: "APPLICATION", label: "Application" },
    { value: "CONTAINER", label: "Container" },
    { value: "CLOUD_SERVICE", label: "Cloud Service" },
    { value: "OTHER", label: "Other" },
  ];

  const environmentOptions = [
    { value: "", label: "All Environments" },
    { value: "PRODUCTION", label: "Production" },
    { value: "STAGING", label: "Staging" },
    { value: "DEVELOPMENT", label: "Development" },
    { value: "TEST", label: "Test" },
  ];

  const getTypeIcon = (type: string) => {
    return <Server className="h-4 w-4" />;
  };

  const getEnvironmentColor = (environment?: string) => {
    switch (environment) {
      case "PRODUCTION":
        return "destructive";
      case "STAGING":
        return "default";
      case "DEVELOPMENT":
        return "secondary";
      case "TEST":
        return "outline";
      default:
        return "secondary";
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Failed to load systems</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter affected systems</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or hostname..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="w-full md:w-48">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-48">
              <Select
                value={environmentFilter}
                onValueChange={setEnvironmentFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by environment" />
                </SelectTrigger>
                <SelectContent>
                  {environmentOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Systems List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data?.data && data.data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.data.map((system) => (
            <Card
              key={system.id}
              className={
                selectable ? "cursor-pointer hover:border-primary" : ""
              }
              onClick={() => selectable && onSelect?.(system)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(system.type)}
                    <CardTitle className="text-base">{system.name}</CardTitle>
                  </div>
                  {!selectable && (
                    <div className="flex gap-1">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(system);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(system.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">{system.type}</Badge>
                  {system.environment && (
                    <Badge variant={getEnvironmentColor(system.environment)}>
                      {system.environment}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <dl className="space-y-1 text-sm">
                  {system.version && (
                    <div>
                      <dt className="font-medium text-muted-foreground inline">
                        Version:{" "}
                      </dt>
                      <dd className="inline">{system.version}</dd>
                    </div>
                  )}
                  {system.hostname && (
                    <div>
                      <dt className="font-medium text-muted-foreground inline">
                        Hostname:{" "}
                      </dt>
                      <dd className="inline">{system.hostname}</dd>
                    </div>
                  )}
                  {system.ip_address && (
                    <div>
                      <dt className="font-medium text-muted-foreground inline">
                        IP:{" "}
                      </dt>
                      <dd className="inline">{system.ip_address}</dd>
                    </div>
                  )}
                  {system.owner && (
                    <div>
                      <dt className="font-medium text-muted-foreground inline">
                        Owner:{" "}
                      </dt>
                      <dd className="inline">{system.owner}</dd>
                    </div>
                  )}
                  {system.description && (
                    <div className="pt-2">
                      <p className="text-muted-foreground">
                        {system.description}
                      </p>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Server className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No affected systems found</p>
            {(search || typeFilter || environmentFilter) && (
              <Button
                variant="link"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("");
                  setEnvironmentFilter("");
                }}
                className="mt-2"
              >
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this affected system. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
