/*React context (AppContext) that provides global state and shared functionality across the application. It manages a pageTitle string and a tutorial boolean using React state, exposing both their values and setter functions through a custom hook called useApp, which ensures the context is only used within the AppProvider. 
Additionally, it includes a handleVisitPage function that tracks visited routes in localStorage, normalizing dynamic URL segments (such as UUIDs) into a generic /id format to avoid storing duplicate paths for pages that differ only by unique identifiers. The AppProvider wraps the application and makes all these values and functions accessible to its children components. */

import React, { createContext, useContext, ReactNode } from "react";

export type ViewMode = "approver" | "requester";

export interface ContextType {
  pageTitle: string;
  setPageTitle: (title: string) => void;
  handleVisitPage: () => void;
  tutorial: boolean;
  setTutorial: (tutorial: boolean) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

// Create the app
//  context with proper typing
export const AppContext = createContext<ContextType | undefined>(undefined);

// Custom hook to use the app context
export const useApp = (): ContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

// App provider component
export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [pageTitle, setPageTitle] = React.useState<string>("Sin título");
  const [tutorial, setTutorial] = React.useState<boolean>(false);
  const [viewMode, setViewModeState] = React.useState<ViewMode>(
    () => (localStorage.getItem("viewMode") as ViewMode) || "approver"
  );

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem("viewMode", mode);
  };

  const handleVisitPage = () => {
    const visitedPages = JSON.parse(
      localStorage.getItem("visitedPages") || "[]"
    );
    // Split the current page if it has a uuid
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    const segments = location.pathname.split("/").filter((seg) => seg !== "");
    if (segments.length === 0) return;
    if (uuidRegex.test(segments[segments.length - 1] ?? "")) {
      segments.pop();
      segments.push("id");
    }
    const cleaned = "/" + segments.join("/");

    // Check if the current page is already in the list
    if (!visitedPages.includes(cleaned)) {
      // Add the current page to the list
      visitedPages.push(cleaned);
      localStorage.setItem("visitedPages", JSON.stringify(visitedPages));
    }
  };

  return (
    <AppContext.Provider
      value={{
        pageTitle,
        setPageTitle,
        handleVisitPage,
        tutorial,
        setTutorial,
        viewMode,
        setViewMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
