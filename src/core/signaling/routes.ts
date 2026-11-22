// Which conversation each mailbox we listen on belongs to.
export type Route = { kind: 'contact'; id: string } | { kind: 'invite' };

export const routes = new Map<string, Route>();
