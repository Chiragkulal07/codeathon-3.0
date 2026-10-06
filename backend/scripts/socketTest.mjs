import { io } from 'socket.io-client';

const url = process.env.URL || 'http://localhost:5000';
const fileId = process.env.FILE_ID;

const connect = (token) =>
  new Promise((resolve, reject) => {
    const s = io(url, { auth: { token } });
    s.on('connect', () => resolve(s));
    s.on('connect_error', (e) => reject(new Error('connect failed: ' + e.message)));
  });
const emit = (s, ev, data) => new Promise((resolve) => s.emit(ev, data, resolve));

const a = await connect(process.env.TOKEN_A); // Chirag (owner)
const b = await connect(process.env.TOKEN_B); // Bob (viewer grant)

b.on('presence:update', (p) => console.log('B sees viewers:', p.viewers.map((v) => v.email)));
b.on('file:updated', (u) => console.log('B got live update:', JSON.stringify(u.content), 'v' + u.version));

const ja = await emit(a, 'file:join', { fileId });
console.log('A joined: canEdit =', ja.canEdit, ', version =', ja.version);
const jb = await emit(b, 'file:join', { fileId });
console.log('B joined: canEdit =', jb.canEdit, ', viewers =', jb.viewers.length);

const e1 = await emit(a, 'file:edit', { fileId, baseVersion: ja.version, content: 'hello from A' });
console.log('A edit:', e1);
const e2 = await emit(a, 'file:edit', { fileId, baseVersion: ja.version, content: 'stale edit' });
console.log('A stale edit (expect conflict:true):', e2);
const e3 = await emit(b, 'file:edit', { fileId, baseVersion: jb.version, content: 'sneaky' });
console.log('B edit (expect denied):', e3);

await new Promise((r) => setTimeout(r, 300));
a.close();
b.close();
process.exit(0);