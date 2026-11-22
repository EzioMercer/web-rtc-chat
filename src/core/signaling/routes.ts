// Which conversation each mailbox we listen on belongs to.
export enum RouteKind {
  Contact,
  Invite,
  // Where we wait for an inviter to reveal their key, after using their invite.
  Reveal,
}

export type Route = { kind: RouteKind.Contact; id: string } | { kind: RouteKind.Invite } | { kind: RouteKind.Reveal };

export const routes = new Map<string, Route>();
