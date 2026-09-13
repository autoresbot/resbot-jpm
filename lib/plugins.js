import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { log } from './logger.js';

const pluginDir = path.join(process.cwd(), 'plugins');

/**
 * Muat semua file di folder plugins/.
 * Nama file = nama perintah. Contoh: plugins/menu.js -> perintah "menu".
 */
export async function loadPlugins() {
  const commands = {};

  for (const file of fs.readdirSync(pluginDir)) {
    if (!file.endsWith('.js')) continue;

    const name = path.basename(file, '.js');
    try {
      const module = await import(pathToFileURL(path.join(pluginDir, file)).href);
      const handler = module.default;
      if (typeof handler === 'function') commands[name] = handler;
      else log(`Plugin ${file} dilewati (tidak punya "export default")`, 'yellow');
    } catch (error) {
      log(`Gagal memuat plugin ${file}: ${error.message}`, 'red');
    }
  }

  log(`${Object.keys(commands).length} perintah dimuat: ${Object.keys(commands).join(', ')}`);
  return commands;
}
