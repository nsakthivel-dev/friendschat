import { FastifyInstance, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "./db.js";

const credentials = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().min(1).max(80).optional() });
export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (req, reply) => {
    const input = credentials.parse(req.body);
    if (!input.name) return reply.code(400).send({ error: "name is required" });
    const passwordHash = await bcrypt.hash(input.password, 12);
    try {
      const user = await prisma.user.create({ data: { email: input.email.toLowerCase(), name: input.name, passwordHash } });
      return reply.code(201).send({ user: publicUser(user), token: app.jwt.sign({ sub: user.id }) });
    } catch { return reply.code(409).send({ error: "email already registered" }); }
  });
  app.post("/auth/login", async (req, reply) => {
    const input = credentials.pick({ email: true, password: true }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) return reply.code(401).send({ error: "invalid credentials" });
    return { user: publicUser(user), token: app.jwt.sign({ sub: user.id }) };
  });
  app.get("/auth/me", { preHandler: app.authenticate }, async (req) => ({ user: await prisma.user.findUnique({ where: { id: userId(req) }, select: { id: true, email: true, name: true, avatarUrl: true, lastSeenAt: true } }) }));
}
export function publicUser(user: { id: string; email: string; name: string; avatarUrl: string | null }) {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
}
export function userId(req: FastifyRequest): string { return (req.user as { sub: string }).sub; }
