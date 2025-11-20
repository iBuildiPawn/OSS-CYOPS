"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface PageHeaderContextType {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  setPageHeader: (
    title: string,
    description?: string,
    icon?: ReactNode,
    actions?: ReactNode,
  ) => void;
}

const PageHeaderContext = createContext<PageHeaderContextType | undefined>(
  undefined,
);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState("Dashboard");
  const [description, setDescription] = useState<string | undefined>();
  const [icon, setIcon] = useState<ReactNode | undefined>();
  const [actions, setActions] = useState<ReactNode | undefined>();

  const setPageHeader = (
    newTitle: string,
    newDescription?: string,
    newIcon?: ReactNode,
    newActions?: ReactNode,
  ) => {
    setTitle(newTitle);
    setDescription(newDescription);
    setIcon(newIcon);
    setActions(newActions);
  };

  return (
    <PageHeaderContext.Provider
      value={{ title, description, icon, actions, setPageHeader }}
    >
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader() {
  const context = useContext(PageHeaderContext);
  if (context === undefined) {
    throw new Error("usePageHeader must be used within a PageHeaderProvider");
  }
  return context;
}
