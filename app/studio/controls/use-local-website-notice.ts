"use client";
import { useEffect, useState } from "react";
import { createStudioPreferenceRepository } from "../studio-preference-repository.mjs";
import { saveStudioPreferenceThroughOwner } from "../studio-preference-broker.mjs";

const key = "acm-studio-local-website-notice-dismissed-v1";
const changed = "acm-studio-local-website-notice-saved";
const read = (storage: Storage) => storage.getItem(key) === "true";

export function useLocalWebsiteNotice(): [boolean, () => void, string] {
  const [dismissed, setDismissed] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const refresh = () => { try { setDismissed(read(window.localStorage)); } catch { setDismissed(false); } };
    const storageChanged = (event: StorageEvent) => { if (event.key === key || event.key === null) refresh(); };
    refresh();
    window.addEventListener("storage", storageChanged);
    window.addEventListener(changed, refresh);
    return () => { window.removeEventListener("storage", storageChanged); window.removeEventListener(changed, refresh); };
  }, []);
  const dismiss = () => {
    setError("");
    void (async () => {
      try {
        const repository = createStudioPreferenceRepository({ storage: window.localStorage, key, read, validate: (value: string) => value === "true" });
        let result = await repository.save("true");
        if (!result.saved && result.reason === "blocked") result = await saveStudioPreferenceThroughOwner("localNotice", "true");
        if (result.saved) { setDismissed(true); window.dispatchEvent(new Event(changed)); }
        else setError("The notice could not be dismissed. Please try again.");
      } catch { setError("The notice could not be dismissed. Please try again."); }
    })();
  };
  return [dismissed, dismiss, error];
}
