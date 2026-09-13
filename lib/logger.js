import clc from 'cli-color';

const COLORS = {
  green: clc.green,
  red: clc.red,
  yellow: clc.yellow,
  blue: clc.blue,
};

/** Jam sekarang dalam format HH:MM */
export function displayTime() {
  const now = new Date();
  const jam = String(now.getHours()).padStart(2, '0');
  const menit = String(now.getMinutes()).padStart(2, '0');
  return `${jam}:${menit}`;
}

/** Tulis pesan ke terminal lengkap dengan jam dan warna */
export function log(message, color = 'green') {
  const paint = COLORS[color] ?? COLORS.green;
  console.log(paint(`[${displayTime()}] ${message}`));
}

export default log;
