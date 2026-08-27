export type Role = "admin" | "coordinator" | "member" | "viewer";

export type Actor = {
  userId: string;
  memberId: string;
  role: Role;
};

export function isCoordinatorLike(role: Role): boolean {
  return role === "coordinator" || role === "admin";
}
