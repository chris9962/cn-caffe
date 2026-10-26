import type { Branch } from "@/types/branch";
import type { CurrentUser, ManagerPermission } from "@/types/employee";

export function isAdmin(user: CurrentUser) {
  return user.role === "admin" || user.role === "director";
}

export function hasShiftPermission(user: CurrentUser, permission: ManagerPermission) {
  return isAdmin(user) || user.permissions.includes(permission);
}

// A manager only reaches shifts at their own branches, so any other branch would give an empty list or a 403.
export function managedBranches(user: CurrentUser, branches: Branch[]) {
  return isAdmin(user) ? branches : branches.filter((branch) => user.managerBranchIds.includes(branch.id));
}
