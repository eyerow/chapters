import React, { useEffect, useMemo, useState } from "react";
import { useTranslations } from "./useTranslations";
import Fuse from "fuse.js";
import "./App.css";
import { unflattenJSON } from "./utils";

interface Translation {
  key: string;
  [language: string]: any;
}

interface TranslationWithStatus extends Translation {
  status: string;
}

const renderTranslation = (translation: any, key: string): React.ReactNode => {
  if (!translation) return null;

  const keys = key
    .replace(/\[(\w+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);

  let value = translation;
  for (const k of keys) {
    if (value && k in value) {
      value = value[k];
    } else {
      return null;
    }
  }

  if (typeof value === "string" || typeof value === "number") {
    return <span>{value}</span>;
  } else if (Array.isArray(value)) {
    return (
      <ul>
        {value.map((item, index) => (
          <li key={index}>{renderTranslation(item, key)}</li>
        ))}
      </ul>
    );
  } else if (typeof value === "object") {
    return (
      <div>
        {Object.entries(value).map(([childKey, childValue]) => (
          <div key={childKey}>
            <strong>{childKey}:</strong>{" "}
            {renderTranslation(childValue, childKey)}
          </div>
        ))}
      </div>
    );
  }

  return null;
};

const App: React.FC = () => {
  const {
    allTranslations,
    flattenedData,
    allKeys,
    primaryLanguage,
    setPrimaryLanguage,
    selectFolder,
  } = useTranslations();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>(searchQuery);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Combine all translations
  const combinedTranslations = useMemo<Translation[]>(() => {
    const translations = allKeys.map((key) => {
      const translation: Translation = { key };
      for (const language in flattenedData) {
        translation[language] = flattenedData[language][key] || "";
      }
      return translation;
    });
    return translations;
  }, [allKeys, flattenedData]);

  // Determine status for each key
  const translationsWithStatus = useMemo<TranslationWithStatus[]>(() => {
    if (!primaryLanguage) {
      return combinedTranslations.map((item) => ({ ...item, status: "" }));
    }

    return combinedTranslations.map((item) => {
      const primaryExists = item[primaryLanguage] !== "";
      const totalLanguages = Object.keys(flattenedData).length;
      const existingLanguages = Object.keys(flattenedData).filter(
        (language) => item[language] !== ""
      ).length;

      let status = "";

      if (existingLanguages === totalLanguages) {
        status = "translated";
      } else if (primaryExists && existingLanguages < totalLanguages) {
        status = "incomplete";
      } else if (!primaryExists && existingLanguages > 0) {
        status = "error";
      }

      return { ...item, status };
    });
  }, [combinedTranslations, primaryLanguage, flattenedData]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const fuse = useMemo(() => {
    return new Fuse<TranslationWithStatus>(translationsWithStatus, {
      keys: ["key", ...Object.keys(flattenedData)],
      threshold: 0.3, // Adjust for fuzziness
    });
  }, [translationsWithStatus, flattenedData]);

  const results = useMemo<TranslationWithStatus[]>(() => {
    let items: TranslationWithStatus[] = [];
    if (!debouncedQuery) {
      items = translationsWithStatus;
    } else {
      items = fuse.search(debouncedQuery).map((result) => result.item);
    }

    if (statusFilter === "all") {
      return items;
    } else {
      return items.filter((item) => item.status === statusFilter);
    }
  }, [fuse, debouncedQuery, translationsWithStatus, statusFilter]);

  // Compute counts for each status
  const statusCounts = useMemo(() => {
    let translated = 0;
    let incomplete = 0;
    let error = 0;

    translationsWithStatus.forEach((item) => {
      if (item.status === "translated") translated += 1;
      else if (item.status === "incomplete") incomplete += 1;
      else if (item.status === "error") error += 1;
    });

    return { translated, incomplete, error };
  }, [translationsWithStatus]);

  return (
    <div className="app-container">
      <aside className="sidebar-container">
        <button onClick={selectFolder}>Select Root Folder</button>

        {/* Primary Language Selector */}
        <div>
          <label htmlFor="primary-language">Primary Language:</label>
          <select
            id="primary-language"
            value={primaryLanguage}
            onChange={(e) => setPrimaryLanguage(e.target.value)}
          >
            {Object.keys(flattenedData).map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </div>

        <>
          <label htmlFor="status-filter">Filter by Status:</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="translated">Translated</option>
            <option value="incomplete">Incomplete</option>
            <option value="error">Error</option>
          </select>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search translations..."
          />
          <div className="status-container">
            <ul className="list-group">
              <li>
                Translated:
                <span className="badge translated">
                  {statusCounts.translated}
                </span>
              </li>
              <li>
                Incomplete:
                <span className="badge incomplete">
                  {statusCounts.incomplete}
                </span>
              </li>
              <li>
                Error:
                <span className="badge error">{statusCounts.error}</span>
              </li>
            </ul>
          </div>
        </>
      </aside>
      {/* Display Results */}
      <main className="main-content-container">
        <div className="results-section">
          {results.length === 0 && <p>No results found.</p>}
          {results.length > 0 && (
            <div className="translations-container">
              {results.map((translation) => {
                // Unflatten each translation to reconstruct the nested structure
                const nestedTranslations: Record<string, any> = {};
                for (const language of Object.keys(flattenedData)) {
                  nestedTranslations[language] = unflattenJSON({
                    [translation.key]: translation[language],
                  });
                }

                return (
                  <div key={translation.key} className="translation-key">
                    <h3>{translation.key}</h3>
                    <div className="cards-container">
                      {allTranslations.map((input) => (
                        <div className="translation-card" key={input.id}>
                          <div
                            className={`badge ${translation.status}`}
                            title={`Status: ${
                              translation.status.charAt(0).toUpperCase() +
                              translation.status.slice(1)
                            }`}
                          >
                            {input.name}
                          </div>
                          <div className="translation-text">
                            {renderTranslation(
                              nestedTranslations[input.name],
                              translation.key
                            ) || <span className="missing-text">Missing</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
