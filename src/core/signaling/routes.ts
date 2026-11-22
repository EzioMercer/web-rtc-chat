// Which conversation each mailbox we listen on belongs to.
export enum RouteKind {
  Contact,
  Invite,
}

export type Route = { kind: RouteKind.Contact; id: string } | { kind: RouteKind.Invite };

export const routes = new Map<string, Route>();
