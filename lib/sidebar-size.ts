export const DEFAULT_SIDEBAR_WIDTH = 288;
export const MIN_SIDEBAR_WIDTH = 240;
export const MAX_SIDEBAR_WIDTH = 480;

export function sidebarWidthLimit(viewport:number) {
 return Math.max(MIN_SIDEBAR_WIDTH,Math.min(MAX_SIDEBAR_WIDTH,viewport-52-360));
}
export function clampSidebarWidth(width:number,viewport=Infinity) {
 return Math.round(Math.max(MIN_SIDEBAR_WIDTH,Math.min(sidebarWidthLimit(viewport),Number.isFinite(width)?width:DEFAULT_SIDEBAR_WIDTH)));
}
