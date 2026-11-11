// Prueba de humo contra la compilación de producción (.next/standalone), como corre en Coolify.
// Requiere `npm run build` antes. Revisa rutas, protección de Gerencia y del empleado.
import assert from 'node:assert/strict';
import {spawn, type ChildProcess} from 'node:child_process';
import {cpSync, existsSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {after, before, describe, test} from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const standalone = path.join(root, '.next', 'standalone');
const PORT = 3199;
const base = `http://127.0.0.1:${PORT}`;
let server: ChildProcess;
const dataDir = mkdtempSync(path.join(tmpdir(), 'eval-srv-'));

before(async () => {
  assert.ok(existsSync(path.join(standalone, 'server.js')), 'Falta la compilación: corre npm run build');
  // Igual que el Dockerfile: estáticos junto al servidor standalone
  cpSync(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'), {recursive: true});
  server = spawn(process.execPath, ['server.js'], {
    cwd: standalone,
    env: {...process.env, PORT: String(PORT), HOSTNAME: '127.0.0.1', DATA_DIR: dataDir, MANAGER_PASSWORD: 'clave-de-prueba', SESSION_SECRET: 'secreto-de-prueba', NODE_ENV: 'production'},
    stdio: 'ignore',
  });
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('El servidor no arrancó');
});

after(() => {
  server?.kill();
  rmSync(dataDir, {recursive: true, force: true});
});

const get = (p: string, cookie?: string) => fetch(base + p, {redirect: 'manual', headers: cookie ? {cookie} : {}});

describe('Servidor de producción', () => {
  test('salud responde ok', async () => {
    const r = await get('/api/health');
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), {ok: true});
  });

  test('el ingreso del empleado carga en español', async () => {
    const r = await get('/');
    assert.equal(r.status, 200);
    const html = await r.text();
    assert.match(html, /lang="es"/);
    assert.match(html, /Ingresa con tu cédula/);
  });

  test('el ingreso de Gerencia carga', async () => {
    const r = await get('/gerencia/ingreso');
    assert.equal(r.status, 200);
    assert.match(await r.text(), /Clave de Gerencia/);
  });

  for (const p of ['/gerencia', '/gerencia/empleados', '/gerencia/preguntas', '/gerencia/resultados', '/gerencia/ajustes', '/gerencia/empleados/nuevo']) {
    test(`sin sesión ${p} manda al ingreso de Gerencia`, async () => {
      const r = await get(p);
      const html = r.status === 200 ? await r.text() : '';
      const redirected = [303, 307, 308].includes(r.status) && /\/gerencia\/ingreso/.test(r.headers.get('location') || '');
      // Next puede redirigir con estado 3xx o con un meta refresh en el HTML
      assert.ok(redirected || /gerencia\/ingreso/.test(html), `${p} respondió ${r.status}`);
      assert.doesNotMatch(html, /Banco de preguntas|Agregar empleado|Ventana del examen/);
    });
  }

  for (const p of ['/empleado', '/empleado/examen', '/empleado/resultado']) {
    test(`sin sesión ${p} manda al ingreso del empleado`, async () => {
      const r = await get(p);
      const html = r.status === 200 ? await r.text() : '';
      const loc = r.headers.get('location') || '';
      assert.ok(([303, 307, 308].includes(r.status) && (loc === '/' || loc.endsWith(':' + PORT + '/'))) || /NEXT_REDIRECT|url=\//.test(html), `${p} respondió ${r.status} ${loc}`);
    });
  }

  test('una cookie falsificada no da acceso a Gerencia', async () => {
    const fake = Buffer.from(JSON.stringify({t: 'm', iat: Math.floor(Date.now() / 1000)})).toString('base64url');
    const r = await get('/gerencia/preguntas', `eval_session=${fake}.firmafalsa`);
    const html = r.status === 200 ? await r.text() : '';
    assert.doesNotMatch(html, /Banco de preguntas/);
  });

  test('la exportación de Excel exige sesión de Gerencia', async () => {
    const r = await get('/gerencia/exportar?mes=2026-11');
    assert.ok([303, 307, 308].includes(r.status), `respondió ${r.status}`);
    assert.match(r.headers.get('location') || '', /gerencia\/ingreso/);
    // Detrás del proxy de Coolify no debe filtrarse la dirección interna del contenedor.
    assert.doesNotMatch(r.headers.get('location') || '', /0\.0\.0\.0|localhost|127\.0\.0\.1/);
  });

  test('los estilos y la letra se sirven', async () => {
    const html = await (await get('/')).text();
    const css = html.match(/\/_next\/static\/css\/[^"]+\.css/)?.[0];
    assert.ok(css, 'sin hoja de estilos');
    const r = await get(css);
    assert.equal(r.status, 200);
    assert.match(await r.text(), /f0360a/i);
  });
});
