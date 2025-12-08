export interface MenuItem {
  label: string;
  path: string;
  paths?: string[];
}

export const MENU_ITEMS: MenuItem[] = [
  {
    label: "LENDING",
    path: "/",
    paths: ["/", "/index", "/tokenDetail/"],
  },
];

export function isMenuActive(pathname: string, menuItem: MenuItem): boolean {
  const hasExactMatch = MENU_ITEMS.some((item) => {
    if (item.paths) {
      return item.paths.some(
        (path) => !path.endsWith("/") && pathname === path
      );
    }
    return pathname === item.path;
  });

  if (hasExactMatch) {
    if (menuItem.paths) {
      return menuItem.paths.some(
        (path) => !path.endsWith("/") && pathname === path
      );
    }
    return pathname === menuItem.path;
  }

  if (menuItem.paths) {
    return menuItem.paths.some((path) => {
      if (path.endsWith("/")) {
        return pathname.startsWith(path);
      }
      return pathname === path;
    });
  }
  return pathname === menuItem.path;
}
