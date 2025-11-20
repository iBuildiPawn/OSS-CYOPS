"use client";

import { Check, ChevronsUpDown, Plus, Server } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssets } from "@/hooks/use-assets";
import { cn } from "@/lib/utils";
import type { Asset, Environment, SystemType } from "@/types/asset";

interface AssetSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  onNewAsset?: (asset: NewAssetData) => void;
  disabled?: boolean;
  placeholder?: string;
}

export interface NewAssetData {
  hostname: string;
  ip_address: string;
  system_type: SystemType;
  environment: Environment;
}

export function AssetSelector({
  value,
  onChange,
  onNewAsset,
  disabled = false,
  placeholder = "Select assets...",
}: AssetSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // New asset form state
  const [newAssetData, setNewAssetData] = useState<NewAssetData>({
    hostname: "",
    ip_address: "",
    system_type: "SERVER",
    environment: "PRODUCTION",
  });

  // Fetch assets with search
  const { data: assetsResponse, isLoading } = useAssets({
    search: searchQuery,
    limit: 50,
  });

  const assets = assetsResponse?.data || [];
  const selectedAssets = assets.filter((asset) => value.includes(asset.id));

  const handleSelect = (assetId: string) => {
    const newValue = value.includes(assetId)
      ? value.filter((id) => id !== assetId)
      : [...value, assetId];
    onChange(newValue);
  };

  const handleAddNew = () => {
    if (!newAssetData.hostname && !newAssetData.ip_address) {
      toast.error("Please provide at least hostname or IP address");
      return;
    }

    if (onNewAsset) {
      onNewAsset(newAssetData);
      setDialogOpen(false);
      // Reset form
      setNewAssetData({
        hostname: "",
        ip_address: "",
        system_type: "SERVER",
        environment: "PRODUCTION",
      });
      toast.success("Asset will be created with the vulnerability");
    }
  };

  return (
    <div className="space-y-2">
      {/* Selected Assets Display */}
      {selectedAssets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedAssets.map((asset) => (
            <Badge
              key={asset.id}
              variant="secondary"
              className="flex items-center gap-1"
            >
              <Server className="h-3 w-3" />
              {asset.hostname || asset.ip_address || asset.asset_id}
              <button
                type="button"
                onClick={() => handleSelect(asset.id)}
                className="ml-1 rounded-full hover:bg-muted"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Asset Selector Combobox */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            {placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search assets..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                <div className="py-6 text-center text-sm">
                  <p className="mb-2">No assets found.</p>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Asset
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Asset</DialogTitle>
                        <DialogDescription>
                          This asset will be created when you save the
                          vulnerability.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="hostname">
                            Hostname{" "}
                            <span className="text-muted-foreground text-xs">
                              (optional)
                            </span>
                          </Label>
                          <Input
                            id="hostname"
                            value={newAssetData.hostname}
                            onChange={(e) =>
                              setNewAssetData({
                                ...newAssetData,
                                hostname: e.target.value,
                              })
                            }
                            placeholder="e.g., web-server-01"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ip_address">
                            IP Address{" "}
                            <span className="text-muted-foreground text-xs">
                              (optional)
                            </span>
                          </Label>
                          <Input
                            id="ip_address"
                            value={newAssetData.ip_address}
                            onChange={(e) =>
                              setNewAssetData({
                                ...newAssetData,
                                ip_address: e.target.value,
                              })
                            }
                            placeholder="e.g., 192.168.1.100"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="system_type">System Type</Label>
                          <Select
                            value={newAssetData.system_type}
                            onValueChange={(value) =>
                              setNewAssetData({
                                ...newAssetData,
                                system_type: value as SystemType,
                              })
                            }
                          >
                            <SelectTrigger id="system_type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SERVER">Server</SelectItem>
                              <SelectItem value="WORKSTATION">
                                Workstation
                              </SelectItem>
                              <SelectItem value="NETWORK_DEVICE">
                                Network Device
                              </SelectItem>
                              <SelectItem value="APPLICATION">
                                Application
                              </SelectItem>
                              <SelectItem value="CONTAINER">
                                Container
                              </SelectItem>
                              <SelectItem value="CLOUD_SERVICE">
                                Cloud Service
                              </SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="environment">Environment</Label>
                          <Select
                            value={newAssetData.environment}
                            onValueChange={(value) =>
                              setNewAssetData({
                                ...newAssetData,
                                environment: value as Environment,
                              })
                            }
                          >
                            <SelectTrigger id="environment">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PRODUCTION">
                                Production
                              </SelectItem>
                              <SelectItem value="STAGING">Staging</SelectItem>
                              <SelectItem value="DEVELOPMENT">
                                Development
                              </SelectItem>
                              <SelectItem value="TEST">Test</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleAddNew}>Add Asset</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {assets.map((asset) => (
                  <CommandItem
                    key={asset.id}
                    value={asset.id}
                    onSelect={() => {
                      handleSelect(asset.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.includes(asset.id) ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {asset.hostname || asset.ip_address || asset.asset_id}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {asset.system_type} · {asset.environment}
                        {asset.ip_address && ` · ${asset.ip_address}`}
                      </span>
                    </div>
                  </CommandItem>
                ))}
                {!isLoading && assets.length > 0 && (
                  <CommandItem
                    onSelect={() => {
                      setDialogOpen(true);
                      setOpen(false);
                    }}
                    className="justify-center text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Asset
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
