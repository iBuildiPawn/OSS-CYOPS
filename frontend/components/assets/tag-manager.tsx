"use client";

import { useState, type KeyboardEvent } from "react";
import type { AssetTag } from "@/types/asset";
import {
  useAddAssetTags,
  useRemoveAssetTag,
  validateTag,
  normalizeTag,
  getTagColor,
} from "@/hooks/use-asset-tags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Tag as TagIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagManagerProps {
  assetId: string;
  tags: AssetTag[];
  readOnly?: boolean;
  className?: string;
}

export function TagManager({
  assetId,
  tags,
  readOnly = false,
  className,
}: TagManagerProps) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addTags = useAddAssetTags();
  const removeTag = useRemoveAssetTag();

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleAddTag = () => {
    const normalized = normalizeTag(inputValue);
    const validation = validateTag(normalized);

    if (!validation.valid) {
      setError(validation.error || "Invalid tag");
      return;
    }

    // Check if tag already exists
    if (tags.some((t) => normalizeTag(t.tag) === normalized)) {
      setError("Tag already exists on this asset");
      return;
    }

    setError(null);
    addTags.mutate(
      { assetId, tags: [normalized] },
      {
        onSuccess: () => {
          setInputValue("");
        },
      },
    );
  };

  const handleRemoveTag = (tag: string) => {
    removeTag.mutate({ assetId, tag: normalizeTag(tag) });
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Tag Input */}
      {!readOnly && (
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Add tag (e.g., production, critical, web-server)"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              disabled={addTags.isPending}
              className={error ? "border-red-500" : ""}
            />
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {error}
              </p>
            )}
          </div>
          <Button
            onClick={handleAddTag}
            disabled={!inputValue.trim() || addTags.isPending}
            size="default"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      )}

      {/* Tag List */}
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2 py-2">
            <TagIcon className="h-4 w-4" />
            No tags assigned
          </div>
        ) : (
          tags.map((tagObj, index) => (
            <Badge
              key={`${tagObj.asset_id}-${tagObj.tag}`}
              variant="secondary"
              className={cn(
                "px-3 py-1.5 text-sm font-medium flex items-center gap-1.5",
                getTagColor(tagObj.tag, index),
              )}
            >
              <TagIcon className="h-3 w-3" />
              {tagObj.tag}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tagObj.tag)}
                  disabled={removeTag.isPending}
                  className="ml-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
                  aria-label={`Remove ${tagObj.tag} tag`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))
        )}
      </div>

      {/* Helper Text */}
      {!readOnly && (
        <p className="text-xs text-muted-foreground">
          Press{" "}
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> to
          add a tag. Tags can only contain letters, numbers, hyphens, and
          underscores.
        </p>
      )}
    </div>
  );
}

// Compact version for displaying tags only (no editing)
interface TagListProps {
  tags: AssetTag[];
  maxDisplay?: number;
  className?: string;
}

export function TagList({ tags, maxDisplay = 5, className }: TagListProps) {
  const displayTags = tags.slice(0, maxDisplay);
  const remainingCount = tags.length - maxDisplay;

  if (tags.length === 0) {
    return (
      <div
        className={cn(
          "text-sm text-muted-foreground flex items-center gap-1.5",
          className,
        )}
      >
        <TagIcon className="h-3.5 w-3.5" />
        <span>No tags</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {displayTags.map((tagObj, index) => (
        <Badge
          key={`${tagObj.asset_id}-${tagObj.tag}`}
          variant="secondary"
          className={cn(
            "px-2 py-0.5 text-xs font-medium flex items-center gap-1",
            getTagColor(tagObj.tag, index),
          )}
        >
          <TagIcon className="h-2.5 w-2.5" />
          {tagObj.tag}
        </Badge>
      ))}
      {remainingCount > 0 && (
        <Badge variant="outline" className="px-2 py-0.5 text-xs">
          +{remainingCount} more
        </Badge>
      )}
    </div>
  );
}
