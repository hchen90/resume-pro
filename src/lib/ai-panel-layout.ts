export const AI_PANEL_LAYOUT_KEY = "resume-pro.ai-floating-panel.v1";

export const AI_PANEL_MIN_WIDTH = 320;
export const AI_PANEL_MIN_HEIGHT = 400;
export const AI_PANEL_DEFAULT_WIDTH = 400;

export type AiPanelLayout = {
  open: boolean;
  x: number | null;
  y: number | null;
  width: number;
  height: number;
};

export function getViewportSize() {
  if (typeof window === "undefined") {
    return { width: 1280, height: 800 };
  }

  return { width: window.innerWidth, height: window.innerHeight };
}

export function getDefaultHeight(viewportHeight?: number) {
  const viewport = viewportHeight ?? getViewportSize().height;
  return Math.min(620, viewport - 120);
}

export function getMaxWidth(viewportWidth?: number) {
  const viewport = viewportWidth ?? getViewportSize().width;
  return Math.min(640, Math.floor(viewport * 0.5));
}

export function getMaxHeight(viewportHeight?: number) {
  const viewport = viewportHeight ?? getViewportSize().height;
  return Math.min(viewport * 0.85, viewport - 48);
}

export function clampWidth(width: number, viewportWidth?: number) {
  return Math.min(
    Math.max(width, AI_PANEL_MIN_WIDTH),
    getMaxWidth(viewportWidth),
  );
}

export function clampHeight(height: number, viewportHeight?: number) {
  return Math.min(
    Math.max(height, AI_PANEL_MIN_HEIGHT),
    getMaxHeight(viewportHeight),
  );
}

export function clampPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  viewportWidth?: number,
  viewportHeight?: number,
) {
  const { width: viewportW, height: viewportH } = getViewportSize();
  const maxX = (viewportWidth ?? viewportW) - width;
  const maxY = (viewportHeight ?? viewportH) - height;

  return {
    x: Math.min(Math.max(0, x), Math.max(0, maxX)),
    y: Math.min(Math.max(0, y), Math.max(0, maxY)),
  };
}

function createDefaultLayout(viewportWidth: number, viewportHeight: number): AiPanelLayout {
  return {
    open: false,
    x: null,
    y: null,
    width: clampWidth(AI_PANEL_DEFAULT_WIDTH, viewportWidth),
    height: clampHeight(getDefaultHeight(viewportHeight), viewportHeight),
  };
}

/** Stable snapshot for SSR — must not allocate a new object per call. */
const SERVER_SNAPSHOT = createDefaultLayout(1280, 800);

let clientSnapshot: AiPanelLayout | null = null;

function layoutsEqual(a: AiPanelLayout, b: AiPanelLayout) {
  return (
    a.open === b.open &&
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height
  );
}

function syncClientSnapshot(next: AiPanelLayout): AiPanelLayout {
  if (clientSnapshot !== null && layoutsEqual(clientSnapshot, next)) {
    return clientSnapshot;
  }

  clientSnapshot = next;
  return clientSnapshot;
}

export function getDefaultLayout(): AiPanelLayout {
  const { width, height } = getViewportSize();
  return createDefaultLayout(width, height);
}

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function normalizeLayout(layout: Partial<AiPanelLayout>): AiPanelLayout {
  const { width: viewportW, height: viewportH } = getViewportSize();
  const defaults = getDefaultLayout();

  const normalized: AiPanelLayout = {
    open: layout.open === true,
    x:
      layout.x === null
        ? null
        : isValidNumber(layout.x)
          ? layout.x
          : defaults.x,
    y:
      layout.y === null
        ? null
        : isValidNumber(layout.y)
          ? layout.y
          : defaults.y,
    width: isValidNumber(layout.width)
      ? clampWidth(layout.width, viewportW)
      : defaults.width,
    height: isValidNumber(layout.height)
      ? clampHeight(layout.height, viewportH)
      : defaults.height,
  };

  if (normalized.x !== null && normalized.y !== null) {
    const clamped = clampPosition(
      normalized.x,
      normalized.y,
      normalized.width,
      normalized.height,
      viewportW,
      viewportH,
    );
    normalized.x = clamped.x;
    normalized.y = clamped.y;
  }

  return normalized;
}

export function readLayout(): AiPanelLayout {
  if (typeof window === "undefined") {
    return getDefaultLayout();
  }

  try {
    const raw = localStorage.getItem(AI_PANEL_LAYOUT_KEY);
    if (!raw) {
      return getDefaultLayout();
    }

    return normalizeLayout(JSON.parse(raw) as Partial<AiPanelLayout>);
  } catch {
    return getDefaultLayout();
  }
}

export function writeLayout(partial: Partial<AiPanelLayout>): AiPanelLayout {
  const next = normalizeLayout({ ...readLayout(), ...partial });

  if (typeof window !== "undefined") {
    localStorage.setItem(AI_PANEL_LAYOUT_KEY, JSON.stringify(next));
    commitClientSnapshot(next);
  }

  return next;
}

const layoutListeners = new Set<() => void>();

export function subscribeAiPanelLayout(listener: () => void) {
  layoutListeners.add(listener);
  return () => {
    layoutListeners.delete(listener);
  };
}

export function getAiPanelLayoutSnapshot(): AiPanelLayout {
  return syncClientSnapshot(readLayout());
}

export function getAiPanelLayoutServerSnapshot(): AiPanelLayout {
  return SERVER_SNAPSHOT;
}

function notifyLayoutListeners() {
  for (const listener of layoutListeners) {
    listener();
  }
}

function commitClientSnapshot(next: AiPanelLayout) {
  const previous = clientSnapshot;
  const committed = syncClientSnapshot(next);

  if (previous !== committed) {
    notifyLayoutListeners();
  }
}

export function patchAiPanelLayout(
  partial: Partial<AiPanelLayout>,
): AiPanelLayout {
  const next = normalizeLayout({ ...readLayout(), ...partial });

  if (typeof window !== "undefined") {
    localStorage.setItem(AI_PANEL_LAYOUT_KEY, JSON.stringify(next));
    commitClientSnapshot(next);
  }

  return next;
}
