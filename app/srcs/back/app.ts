import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import multipart from '@fastify/multipart';
import fs from 'fs';
import path from 'path';
import fastifyStatic from '@fastify/static';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
 

declare module '@fastify/session' {
  interface SessionData {
    userId?: number;
  }
}

const fastify = Fastify();
const prisma = new PrismaClient();

fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'avatars'),
  prefix: '/avatars/',
});

// Serve frontend static files (mounted at /app/public via compose)
// Do NOT register a root static prefix to avoid swallowing /api routes.

fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 Mo pour l'avatar (c'est beaucoup)
  }
});
fastify.register(fastifyCookie);
fastify.register(fastifySession, {
  secret: 'secretsecretsecretsecretsecretsecret',
  cookie: { secure: false, httpOnly: true, sameSite: 'lax' }, // secure: true en prod HTTPS
  saveUninitialized: false
});

declare module 'fastify' {
  interface FastifyRequest {
    userId?: number;
  }
}

fastify.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
  let userId: number | undefined = undefined;
  if ((req.session as any)?.userId)
    userId = (req.session as any).userId;
  else if (req.headers['x-user-id'])
    userId = parseInt(req.headers['x-user-id'] as string, 10);
  else if ((req.body as any)?.userId)
    userId = parseInt((req.body as any).userId, 10);
  (req as any).userId = userId;
});

fastify.post('/api/register', async (req, reply) => {
  const { email, password, displayName } = req.body as any;
  console.log('POST /api/register body =', req.body);
  if (!email || !password || !displayName) {
    return reply.status(400).send({ error: 'Champs requis manquants.' });
  }
  try {
    const exists = await prisma.user.findFirst({ where: { OR: [{ email }, { displayName }] } });
    if (exists) {
      return reply.status(400).send({ error: 'Email ou pseudo déjà utilisé.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hash, displayName } });
    return reply.send({ id: user.id, email: user.email, displayName: user.displayName });
  } catch (e: any) {
    console.error('Register error:', e?.message || e);
    return reply.status(400).send({ error: 'Inscription impossible.' });
  }
});

fastify.post('/api/login', async (req, reply) => {
  const { email, password } = req.body as any;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return reply.status(401).send({ error: 'Email ou mot de passe invalide.' });
  (req.session as any).userId = user.id;
  reply.send({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatar: user.avatar ? user.avatar : '/avatars/default.png'
  });
});

fastify.get('/api/me', async (req, reply) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return reply.status(404).send({ error: 'Utilisateur non trouvé' });
  reply.send({
    email: user.email,
    displayName: user.displayName,
    avatar: user.avatar ? user.avatar : '/avatars/default.png'
  });
});

fastify.put('/api/me', async (req, reply) => {
  const { email, displayName } = req.body as any;
  try {
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { email, displayName }
    });
    reply.send({ email: user.email, displayName: user.displayName });
  } catch (e) {
    reply.status(400).send({ error: 'Email ou pseudo déjà utilisé.' });
  }
});

fastify.post('/api/me/avatar', async (req, reply) => {
  const MAX_SIZE = 50 * 1024; // 50kb
  const parts = req.parts ? req.parts() : null;
  let userId = req.userId;
  let filePart: any = null;

  if (parts) {
    for await (const part of parts) {
      if (part.type === 'file') {
        filePart = part;
      } else if (part.type === 'field' && part.fieldname === 'userId' && !userId) {
        userId = parseInt(part.value as string, 10);
      }
    }
  } else {
    filePart = await (req as any).file();
  }

  if (!filePart) return reply.status(400).send({ error: 'No file uploaded' });
  if (!userId) return reply.status(400).send({ error: 'No userId provided' });

  // Vérification taille du fichier
  const chunks = [];
  let totalSize = 0;
  let tooBig = false;
  for await (const chunk of filePart.file) {
    totalSize += chunk.length;
    if (totalSize > MAX_SIZE) {
      tooBig = true;
      break;
    }
    chunks.push(chunk);
  }
  if (tooBig) {
    // Vide le stream restant pour éviter le blocage
    filePart.file.resume && filePart.file.resume();
    return reply.status(413).send({ error: 'Avatar trop volumineux (max 50kb).' });
  }
  const buffer = Buffer.concat(chunks);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.avatar && user.avatar !== '/avatars/default.png') {
    const oldPath = path.join(__dirname, user.avatar);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  const ext = path.extname(filePart.filename || 'avatar.png');
  const fileName = `user_${userId}_${Date.now()}${ext}`;
  const filePath = path.join(__dirname, 'avatars', fileName);

  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, buffer);

  await prisma.user.update({
    where: { id: userId },
    data: { avatar: `/avatars/${fileName}` }
  });

  reply.send({ success: true, avatar: `/avatars/${fileName}` });
});

fastify.delete('/api/me/avatar', async (req, reply) => { //remettre avatar par defaut
  const userId = req.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.avatar && user.avatar !== '/avatars/default.png') {
    const oldPath = path.join(__dirname, user.avatar);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
  await prisma.user.update({
    where: { id: userId },
    data: { avatar: null }
  });
  reply.send({ success: true });
});

fastify.post('/api/logout', async (req, reply) => {
  if (req.userId) onlineUsers.delete(req.userId);
  req.session.destroy();
  reply.send({ success: true });
});


const onlineUsers = new Map<number, number>();

const ONLINE_TIMEOUT = 10_000; //10sec avant d'etre mis hors ligne

fastify.post('/api/ping', async (req, reply) => { //ping pour le statut en ligne
  if (req.userId) {
    onlineUsers.set(req.userId, Date.now());
    reply.send({ online: true });
  } else {
    reply.status(401).send({ error: 'Non authentifié.' });
  }
});

function isUserOnline(userId: number): boolean {
  const last = onlineUsers.get(userId);
  return !!last && Date.now() - last < ONLINE_TIMEOUT;
}

fastify.get('/api/user/:displayName', async (req, reply) => { //recherche avec pseudo
  const { displayName } = req.params as { displayName: string };
  const user = await prisma.user.findUnique({ where: { displayName } });
  if (!user) return reply.status(404).send({ error: 'Utilisateur non trouvé' });
  reply.send({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatar: user.avatar ? user.avatar : '/avatars/default.png',
    online: isUserOnline(user.id)
  });
});

fastify.get('/api/friends', async (req, reply) => {
  const userId = req.userId;
  if (!userId) return reply.status(401).send({ error: 'Non authentifié.' });
  const friends = await prisma.friend.findMany({
    where: { userId, status: 'ACCEPTED' },
    include: { friend: { select: { id: true, displayName: true, avatar: true, email: true } } },
  });
  reply.send(friends.map(f => ({
    ...f.friend,
    online: isUserOnline(f.friend.id)
  })));
});

fastify.get('/api/friends/requests', async (req, reply) => {
  const userId = req.userId;
  if (!userId) return reply.status(401).send({ error: 'Non authentifié.' });
  const requests = await prisma.friend.findMany({
    where: { friendId: userId, status: 'PENDING' },
    include: { user: { select: { id: true, displayName: true, avatar: true, email: true } } },
  });
  reply.send(requests.map(r => ({
    ...r.user,
    online: isUserOnline(r.user.id),
    friendRequestId: r.id
  })));
});

fastify.post('/api/friends/:id', async (req, reply) => {
  const userId = req.userId;
  const friendId = parseInt((req.params as any).id, 10);
  if (!userId || !friendId) return reply.status(400).send({ error: 'Paramètres invalides.' });
  if (userId === friendId) return reply.status(400).send({ error: 'Impossible de s\'ajouter soi-même.' });

  const existing = await prisma.friend.findFirst({
    where: {
      OR: [
        { userId, friendId },
        { userId: friendId, friendId: userId }
      ]
    }
  });
  if (existing) {
    if (existing.status === 'ACCEPTED')
      return reply.status(400).send({ error: 'Déjà amis.' });
    if (existing.userId === userId)
      return reply.status(400).send({ error: 'Demande déjà envoyée.' });
    else
      return reply.status(400).send({ error: 'Cet utilisateur vous a déjà envoyé une demande.' });
  }

  await prisma.friend.create({
    data: { userId, friendId, status: 'PENDING' }
  });
  reply.send({ success: true });
});

// Serve SPA files explicitly to avoid wildcard issues
const publicDir = path.join(__dirname, 'public');
function safeJoinPublic(p: string): string | null {
  const target = path.join(publicDir, p.replace(/^\/+/, ''));
  const normalized = path.normalize(target);
  if (!normalized.startsWith(publicDir)) return null;
  return normalized;
}

function sendFile(reply: FastifyReply, filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  const typeMap: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml'
  };
  const contentType = typeMap[ext] || 'application/octet-stream';
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    reply.status(404).send({ error: 'Not Found' });
    return;
  }
  if (contentType.startsWith('text/') || contentType.startsWith('application/javascript')) {
    const text = fs.readFileSync(filePath, 'utf-8');
    reply.type(contentType).send(text);
  } else {
    const buf = fs.readFileSync(filePath);
    reply.type(contentType).send(buf);
  }
}

fastify.get('/', (_req, reply) => {
  const filePath = path.join(publicDir, 'index.html');
  const text = fs.readFileSync(filePath, 'utf-8');
  console.log('Serving / index.html bytes=', Buffer.byteLength(text, 'utf-8'));
  return reply.type('text/html; charset=utf-8').send(text);
});
fastify.get('/index.html', (_req, reply) => {
  const filePath = path.join(publicDir, 'index.html');
  const text = fs.readFileSync(filePath, 'utf-8');
  return reply.type('text/html; charset=utf-8').send(text);
});
fastify.get('/main.js', (_req, reply) => {
  const filePath = path.join(publicDir, 'main.js');
  const text = fs.readFileSync(filePath, 'utf-8');
  return reply.type('application/javascript; charset=utf-8').send(text);
});
fastify.get('/favicon.ico', (_req, reply) => {
  const filePath = path.join(publicDir, 'favicon.ico');
  const buf = fs.readFileSync(filePath);
  return reply.type('image/x-icon').send(buf);
});
fastify.get('/img/*', (req, reply) => {
  const rest = (req.params as any)['*'] as string || '';
  const p = safeJoinPublic(path.join('img', rest));
  if (!p) return reply.status(404).send({ error: 'Not Found' });
  const ext = path.extname(p).toLowerCase();
  const type = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream';
  const buf = fs.readFileSync(p);
  return reply.type(type).send(buf);
});
fastify.get('/styles.css', (_req, reply) => {
  const filePath = path.join(publicDir, 'styles.css');
  const text = fs.readFileSync(filePath, 'utf-8');
  return reply.type('text/css; charset=utf-8').send(text);
});
fastify.get('/profile-blur.css', (_req, reply) => {
  const filePath = path.join(publicDir, 'profile-blur.css');
  const text = fs.readFileSync(filePath, 'utf-8');
  return reply.type('text/css; charset=utf-8').send(text);
});

// Diagnostics
fastify.get('/health', (_req, reply) => {
  return reply.type('text/plain').send('ok');
});
fastify.get('/hello', (_req, reply) => {
  return reply.type('text/plain').send('hello');
});

fastify.post('/api/friends/:id/accept', async (req, reply) => {
  const userId = req.userId;
  const requestId = parseInt((req.params as any).id, 10);
  if (!userId || !requestId) return reply.status(400).send({ error: 'Paramètres invalides.' });

  const friendRequest = await prisma.friend.findUnique({ where: { id: requestId } });
  if (!friendRequest || friendRequest.friendId !== userId || friendRequest.status !== 'PENDING')
    return reply.status(404).send({ error: 'Demande non trouvée.' });

  await prisma.friend.update({
    where: { id: requestId },
    data: { status: 'ACCEPTED' }
  });

  await prisma.friend.create({
    data: { userId: userId, friendId: friendRequest.userId, status: 'ACCEPTED' }
  });

  reply.send({ success: true });
});

fastify.delete('/api/friends/:id', async (req, reply) => {
  const userId = req.userId;
  const friendId = parseInt((req.params as any).id, 10);
  if (!userId || !friendId) return reply.status(400).send({ error: 'Paramètres invalides.' });

  await prisma.friend.deleteMany({
    where: {
      OR: [
        { userId, friendId },
        { userId: friendId, friendId: userId }
      ]
    }
  });
  reply.send({ success: true });
});

fastify.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});