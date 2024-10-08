// useTranslations.ts

import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readDir, readTextFile } from "@tauri-apps/plugin-fs";
import { flattenJSON } from "./utils";

export interface TranslationFile {
  id: number;
  name: string;
  content: Record<string, any>;
  error: string;
}

export const useTranslations = () => {
  const [allTranslations, setAllTranslations] = useState<TranslationFile[]>([]);
  const [flattenedData, setFlattenedData] = useState<
    Record<string, Record<string, any>>
  >({});
  const [allKeys, setAllKeys] = useState<string[]>([]);
  const [primaryLanguage, setPrimaryLanguage] = useState<string>("");

  const selectFolder = async () => {
    const selectedFolder = await open({
      multiple: false,
      directory: true,
    });

    if (typeof selectedFolder === "string") {
      try {
        const entries = await readDir(selectedFolder);
        const directories = entries.filter((entry) => entry.isDirectory);

        const translationsArray: TranslationFile[] = [];
        const localFlattenedData: Record<string, Record<string, any>> = {};
        const localAllKeys: Set<string> = new Set();

        for (const [index, directory] of directories.entries()) {
          const translationCode = directory.name;
          const translationFilePath = `${selectedFolder}/${translationCode}/translation.json`;

          try {
            const translationFileContent = await readTextFile(
              translationFilePath
            );
            const parsedContent = JSON.parse(translationFileContent);
            const flattenedContent = flattenJSON(parsedContent);

            // Update local flattenedData
            const translationName = directory.name || "";
            localFlattenedData[translationName] = flattenedContent;

            // Update local allKeys
            Object.keys(flattenedContent).forEach((key) =>
              localAllKeys.add(key)
            );

            translationsArray.push({
              id: index + 1,
              name: translationName,
              content: flattenedContent,
              error: "",
            });
          } catch (error) {
            console.error(error);
            translationsArray.push({
              id: index + 1,
              name: directory.name || "",
              content: {},
              error: `Error reading translation.json: ${error}`,
            });
          }
        }

        // Update state variables
        setFlattenedData(localFlattenedData);
        setAllKeys(Array.from(localAllKeys));

        if (!primaryLanguage && Object.keys(localFlattenedData).length > 0) {
          setPrimaryLanguage(Object.keys(localFlattenedData)[0]);
        }

        setAllTranslations(translationsArray);
      } catch (error) {
        console.error("Error reading directory:", error);
      }
    } else {
      console.log("No folder selected");
    }
  };

  return {
    allTranslations,
    flattenedData,
    allKeys,
    primaryLanguage,
    setPrimaryLanguage,
    selectFolder,
  };
};
