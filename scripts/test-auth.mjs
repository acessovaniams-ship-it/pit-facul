// Run against a LOCAL Worker with the shop schema and cloudflare/auth.sql applied.
import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:8787';
const email = `test-${crypto.randomUUID()}@example.test`;
const password = 'Local-test-password-42';
const post = (body, cookie = '', origin = base) => fetch(`${base}/api/auth`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: cookie }, body: JSON.stringify(body),
});
assert.equal((await fetch(`${base}/api/shop`, { headers: { 'oai-authenticated-user-id': 'fake', 'oai-authenticated-user-email': email } })).status, 401);
assert.equal((await post({ action: 'register', name: 'Teste', email, password }, '', 'https://evil.example')).status, 403);
const registration = await post({ action: 'register', name: 'Teste', email, password });
assert.equal(registration.status, 200, await registration.text());
const setCookie = registration.headers.get('set-cookie');
assert.match(setCookie, /HttpOnly; Secure; SameSite=Lax/);
const cookie = setCookie.split(';')[0];
const shop = await fetch(`${base}/api/shop`, { headers: { Cookie: cookie } });
assert.equal(shop.status, 200, 'Authenticated catalog');
const data = await shop.json();
assert.equal(data.user.role, 'customer');
assert.equal(data.products.length, 6);
assert.equal((await fetch(`${base}/api/admin`, { headers: { Cookie: cookie } })).status, 403);
assert.equal((await post({ action: 'login', email, password: 'incorrect-password' })).status, 401);
assert.equal((await post({ action: 'register', name: 'Teste', email, password })).status, 409);
assert.equal((await post({ action: 'logout' }, cookie)).status, 200);
assert.equal((await fetch(`${base}/api/shop`, { headers: { Cookie: cookie } })).status, 401);
assert.equal((await post({ action: 'login', email, password })).status, 200);
let limited = false;
for (let n = 0; n < 12; n++) if ((await post({ action: 'login', email, password: 'incorrect-password' })).status === 429) { limited = true; break; }
assert.ok(limited, 'Persistent rate limit');
console.log('PASS: register, login, catalog, logout/revocation, forged headers, CSRF, wrong password, duplicate, admin denial and rate limit');
