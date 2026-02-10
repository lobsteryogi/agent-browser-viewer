import { NextResponse } from "next/server";

interface BrowserState {
  isOpen: boolean;
  currentUrl: string;
  pageTitle: string;
  lastScreenshot: string;
  actions: unknown[];
  snapshotTree: string;
}

export async function GET() {
  const state = (globalThis as Record<string, unknown>).__browserState as BrowserState | undefined;

  if (!state) {
    return NextResponse.json({
      isOpen: false,
      currentUrl: "",
      pageTitle: "",
      actionsCount: 0,
    });
  }

  return NextResponse.json({
    isOpen: state.isOpen,
    currentUrl: state.currentUrl,
    pageTitle: state.pageTitle,
    actionsCount: state.actions.length,
  });
}
