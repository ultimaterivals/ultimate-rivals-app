import { getAdminModule, type AdminModuleKey } from "./admin-modules";
import { requireRole } from "./session";

export async function requireAdminModule(key: AdminModuleKey) {
  const adminModule = getAdminModule(key);
  return requireRole(adminModule.allowedRoles);
}
