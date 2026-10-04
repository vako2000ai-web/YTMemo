import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('serves the game from a directory containing spaces and Cyrillic characters', async () => {
  const source = fileURLToPath(new URL('../', import.meta.url));
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'memo-server-'));
  const directory = path.join(temp, 'Мемо игра');
  let child;
  try {
    await fs.mkdir(directory);
    for (const name of await fs.readdir(source)) {
      if (name.endsWith('.js') || ['package.json', 'index.html', 'style.css', 'assets'].includes(name)) {
        await fs.cp(path.join(source, name), path.join(directory, name), {recursive: true});
      }
    }
    await fs.copyFile(path.join(source, 'config.example.json'), path.join(directory, 'config.json'));
    const probe = net.createServer();
    await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
    const port = probe.address().port;
    await new Promise(resolve => probe.close(resolve));
    child = spawn(process.execPath, ['server.js'], {
      cwd: directory,
      env: {...process.env, PORT: String(port), MEMO_CONFIG_PATH: path.join(directory, 'config.json')},
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Server startup timed out')), 10000);
      child.stdout.once('data', () => {clearTimeout(timer); resolve();});
      child.once('error', error => {clearTimeout(timer); reject(error);});
      child.once('exit', code => {clearTimeout(timer); reject(Error(`Server exited with ${code}`));});
    });
    for (const resource of ['/', '/app.js', '/style.css', '/assets/fr.svg']) {
      const response = await fetch(`http://127.0.0.1:${port}${resource}`);
      assert.equal(response.status, 200, resource);
      assert.ok((await response.text()).length > 0, resource);
    }
    const privateConfig = await fetch(`http://127.0.0.1:${port}/config.json`);
    assert.equal(privateConfig.status, 404);
  } finally {
    if (child && child.exitCode === null) {
      const stopped = new Promise(resolve => child.once('exit', resolve));
      child.kill();
      await stopped;
    }
    await fs.rm(temp, {recursive: true, force: true});
  }
});
