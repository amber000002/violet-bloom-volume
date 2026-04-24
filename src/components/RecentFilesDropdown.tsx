/**
 * RecentFilesDropdown — small "History" picker rendered next to each upload
 * dropzone. Lists previously used files for a given category and re-feeds the
 * selected file into the same handler used for fresh uploads.
 */
import React, { useEffect, useState, useCallback } from "react";
import { History, Trash2, ChevronDown } from "lucide-react";
import {
  listRecentFiles,
  deleteRecentFile,
  entryToFile,
  formatBytes,
  formatRelative,
  RecentFileCategory,
  RecentFileEntry,
} from "@/lib/recentFilesStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RecentFilesDropdownProps {
  category: RecentFileCategory;
  onPick: (file: File) => void;
  /** Optional refresh signal: change this number to force a reload. */
  refreshKey?: number;
  label?: string;
}

export const RecentFilesDropdown: React.FC<RecentFilesDropdownProps> = ({
  category,
  onPick,
  refreshKey = 0,
  label = "Recent",
}) => {
  const [entries, setEntries] = useState<RecentFileEntry[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const list = await listRecentFiles(category);
    setEntries(list);
  }, [category]);

  useEffect(() => {
    load();
  }, [load, refreshKey, open]);

  const handlePick = (entry: RecentFileEntry) => {
    setOpen(false);
    onPick(entryToFile(entry));
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    await deleteRecentFile(id);
    load();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-1 bg-background/40 backdrop-blur-sm transition-colors"
          title="Pick a previously uploaded file"
        >
          <History className="w-3 h-3" />
          {label}
          {entries.length > 0 && (
            <span className="text-[10px] text-primary font-semibold">({entries.length})</span>
          )}
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 max-h-80 overflow-y-auto">
        <DropdownMenuLabel className="text-xs">Recent uploads</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {entries.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center">
            No files yet. Uploaded files will appear here.
          </div>
        ) : (
          entries.map((entry) => (
            <DropdownMenuItem
              key={entry.id}
              className="flex items-start gap-2 cursor-pointer py-2"
              onClick={() => handlePick(entry)}
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{entry.name}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span>{formatBytes(entry.size)}</span>
                  <span>•</span>
                  <span>{formatRelative(entry.addedAt)}</span>
                </div>
              </div>
              <button
                onClick={(e) => handleDelete(e, entry.id)}
                className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
                title="Remove from history"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
