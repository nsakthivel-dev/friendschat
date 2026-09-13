import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import sensible from "@fastify/sensible";
import { Server } from "socket.io";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { authRoutes, userId } from "./auth.js";
import { setOffline, setOnline } from "./adapters/redis.js";
import { z } from "zod";

declare module "fastify" {
  interface FastifyInstance { authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>; io?: Server; }
}

export function buildApp() {
  const app = Fastify({ logger: true });
  app.register(cors, { origin: config.webOrigin, credentials: true });
  app.register(jwt, { secret: config.jwtSecret });
  app.register(sensible);
  app.decorate("authenticate", async (req, reply) => {
    try { await req.jwtVerify(); } catch { return reply.code(401).send({ error: "unauthorized" }); }
  });
  app.get("/health", async () => ({ ok: true }));
  app.register(authRoutes);
  app.register(apiRoutes);
  return app;
}

async function apiRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (req, reply) => {
    if (req.url.startsWith("/conversations")) await app.authenticate(req, reply);
  });
  app.get("/conversations", async (req) => prisma.conversation.findMany({ where: { members: { some: { userId: userId(req) } } }, include: { members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { updatedAt: "desc" } }));
  app.post("/conversations", async (req, reply) => {
    const input = z.object({ memberIds: z.array(z.string()).min(1), name: z.string().max(100).optional() }).parse(req.body);
    const ids = [...new Set([userId(req), ...input.memberIds])];
    const conversation = await prisma.conversation.create({ data: { name: input.name, isGroup: ids.length > 2, members: { create: ids.map((id, i) => ({ userId: id, role: i === 0 ? "admin" : "member" })) } }, include: { members: true } });
    return reply.code(201).send(conversation);
  });
  app.get("/conversations/:id/messages", async (req, reply) => {
    const { id } = req.params as { id: string }; const q = z.object({ cursor: z.string().optional(), limit: z.coerce.number().min(1).max(100).default(50) }).parse(req.query);
    if (!await isMember(id, userId(req))) return reply.code(403).send({ error: "forbidden" });
    const messages = await prisma.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: "desc" }, take: q.limit, ...(q.cursor ? { skip: 1, cursor: { id: q.cursor } } : {}), include: { sender: { select: { id: true, name: true, avatarUrl: true } }, receipts: true, reactions: true } });
    return { messages, nextCursor: messages.length === q.limit ? messages[messages.length - 1].id : null };
  });
  app.post("/conversations/:id/messages", async (req, reply) => {
    const { id } = req.params as { id: string }; if (!await isMember(id, userId(req))) return reply.code(403).send({ error: "forbidden" });
    const input = z.object({ body: z.string().trim().min(1).max(10000), attachmentUrl: z.string().url().optional() }).parse(req.body);
    const message = await prisma.message.create({ data: { conversationId: id, senderId: userId(req), ...input }, include: { sender: { select: { id: true, name: true, avatarUrl: true } }, reactions: true, receipts: true } });
    app.io?.to(`conversation:${id}`).emit("message:new", message);
    return reply.code(201).send(message);
  });
  app.post("/messages/:id/receipts", async (req, reply) => {
    const { id } = req.params as { id: string }; const input = z.object({ status: z.enum(["delivered", "read"]) }).parse(req.body);
    const msg = await prisma.message.findUnique({ where: { id }, select: { conversationId: true } }); if (!msg || !await isMember(msg.conversationId, userId(req))) return reply.code(404).send({ error: "message not found" });
    const receipt = await prisma.receipt.upsert({ where: { messageId_userId: { messageId: id, userId: userId(req) } }, create: { messageId: id, userId: userId(req), status: input.status }, update: { status: input.status } });
    app.io?.to(`conversation:${msg.conversationId}`).emit("receipt:update", receipt); return receipt;
  });
  app.post("/messages/:id/reactions", async (req, reply) => {
    const { id } = req.params as { id: string }; const input = z.object({ emoji: z.string().min(1).max(16) }).parse(req.body);
    const msg = await prisma.message.findUnique({ where: { id }, select: { conversationId: true } }); if (!msg || !await isMember(msg.conversationId, userId(req))) return reply.code(404).send({ error: "message not found" });
    const reaction = await prisma.reaction.upsert({ where: { messageId_userId_emoji: { messageId: id, userId: userId(req), emoji: input.emoji } }, create: { messageId: id, userId: userId(req), emoji: input.emoji }, update: {} });
    app.io?.to(`conversation:${msg.conversationId}`).emit("reaction:update", reaction); return reaction;
  });
}
async function isMember(conversationId: string, uid: string) { return !!await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId: uid } } }); }

export function createServer() {
  const app = buildApp();
  const io = new Server({ cors: { origin: config.webOrigin, credentials: true } });
  app.io = io;
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error("missing token");
      const payload = await app.jwt.verify<{ sub: string }>(token);
      socket.data.userId = payload.sub;
      next();
    } catch { next(new Error("unauthorized")); }
  });
  io.on("connection", async socket => {
    const uid = socket.data.userId as string;
    await setOnline(uid);
    socket.join(`user:${uid}`);
    socket.on("conversation:join", async (id: string) => { if (await isMember(id, uid)) socket.join(`conversation:${id}`); });
    socket.on("conversation:leave", (id: string) => socket.leave(`conversation:${id}`));
    socket.on("typing", (id: string) => socket.to(`conversation:${id}`).emit("typing", { userId: uid, conversationId: id }));
    socket.on("disconnect", async () => {
      await setOffline(uid);
      await prisma.user.update({ where: { id: uid }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
    });
  });
  return { app, io };
}

if (process.env.NODE_ENV !== "test") {
  const { app, io } = createServer();
  app.listen({ port: config.port, host: "0.0.0.0" }).then(() => io.attach(app.server))
    .catch(err => { app.log.error(err); process.exit(1); });
}
