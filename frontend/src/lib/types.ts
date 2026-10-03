export type ItemType = "hackathon" | "idea" | "resource" | "task" | "note";

export interface CapturedItem {
  id: string;
  type: ItemType;
  title: string;
  createdAt: string;
  rawInput: string;
  fields: Record<string, unknown>;
  workspaceId: string | null;
}

export interface Workspace {
  id: string;
  templateType: string;
  name: string;
  fields: Record<string, unknown>;
  itemIds: string[];
  items?: CapturedItem[];
}

export interface CaptureResult {
  item: CapturedItem;
  workspace: Workspace | null;
}
