import { getDB } from "../db";
import type { ImportedFile } from "@/types";

export const importedFilesRepo = {
  async list(): Promise<ImportedFile[]> {
    return (await getDB()).getAll("importedFiles");
  },

  async add(file: ImportedFile): Promise<void> {
    await (await getDB()).put("importedFiles", file);
  },

  async remove(id: string): Promise<void> {
    await (await getDB()).delete("importedFiles", id);
  },
};
