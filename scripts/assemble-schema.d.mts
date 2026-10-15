export const fragmentNames: string[];
export const workspaceRelations: Record<string, string>;
export function assembleSchema(read?: (name: string) => string): string;
export function schemaDrift(assembled: string, committed: string): string[];
