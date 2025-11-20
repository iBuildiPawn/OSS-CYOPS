"use client";

import { useState } from "react";
import type { AssetStatus } from "@/types/asset";
import {
  useUpdateAssetStatus,
  canTransitionStatus,
  formatStatus,
  getStatusColor,
} from "@/hooks/use-asset-status";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StatusChangeModalProps {
  assetId: string;
  currentStatus: AssetStatus;
  assetName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_OPTIONS: AssetStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "UNDER_MAINTENANCE",
  "DECOMMISSIONED",
];

export function StatusChangeModal({
  assetId,
  currentStatus,
  assetName,
  open,
  onOpenChange,
}: StatusChangeModalProps) {
  const [selectedStatus, setSelectedStatus] =
    useState<AssetStatus>(currentStatus);
  const [notes, setNotes] = useState("");

  const updateStatus = useUpdateAssetStatus();

  const validation = canTransitionStatus(currentStatus, selectedStatus);
  const isDecommissioning = selectedStatus === "DECOMMISSIONED";

  const handleSubmit = () => {
    if (!validation.allowed) return;

    updateStatus.mutate(
      {
        assetId,
        status: selectedStatus,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setNotes("");
        },
      },
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !updateStatus.isPending) {
      setSelectedStatus(currentStatus);
      setNotes("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Change Asset Status</DialogTitle>
          <DialogDescription>
            Update the operational status of <strong>{assetName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Status */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">
              Current Status
            </Label>
            <div className="mt-1.5">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentStatus)}`}
              >
                {formatStatus(currentStatus)}
              </span>
            </div>
          </div>

          {/* New Status */}
          <div>
            <Label htmlFor="status">New Status</Label>
            <Select
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value as AssetStatus)}
              disabled={updateStatus.isPending}
            >
              <SelectTrigger id="status" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {formatStatus(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Validation Warning */}
          {!validation.allowed && selectedStatus !== currentStatus && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validation.reason}</AlertDescription>
            </Alert>
          )}

          {/* Decommissioning Warning */}
          {isDecommissioning && currentStatus !== "DECOMMISSIONED" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> Decommissioning is permanent and
                cannot be reversed. The asset will be marked as no longer in
                use.
              </AlertDescription>
            </Alert>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes">
              Notes {isDecommissioning && "(Recommended)"}
            </Label>
            <Textarea
              id="notes"
              placeholder="Add notes about this status change..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1.5 min-h-[100px]"
              disabled={updateStatus.isPending}
            />
            <p className="text-sm text-muted-foreground mt-1.5">
              {isDecommissioning
                ? "Please document the reason for decommissioning this asset."
                : "Optional: Provide context for this status change."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={updateStatus.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!validation.allowed || updateStatus.isPending}
            variant={isDecommissioning ? "destructive" : "default"}
          >
            {updateStatus.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Update Status
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
