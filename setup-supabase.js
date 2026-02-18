const { spawn } = require('child_process');
const child = spawn('cmd', ['/c', 'vercel', 'integration', 'add', 'supabase'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, FORCE_COLOR: '0' }
});

let output = '';
let sentName = false;
let sentRegion = false;
let sentPrefix = false;

child.stdout.on('data', (d) => {
  const chunk = d.toString();
  output += chunk;
  process.stdout.write(d);

  if (output.includes('What is the name') && !sentName) {
    sentName = true;
    setTimeout(() => {
      child.stdin.write('duchifatiot\n');
    }, 1500);
  }

  if (output.includes('Choose your region') && !sentRegion) {
    sentRegion = true;
    setTimeout(() => {
      // Navigate down 4 times to reach fra1
      const down = Buffer.from([0x1b, 0x5b, 0x42]);
      child.stdin.write(down);
      setTimeout(() => child.stdin.write(down), 300);
      setTimeout(() => child.stdin.write(down), 600);
      setTimeout(() => child.stdin.write(down), 900);
      setTimeout(() => child.stdin.write('\n'), 1500);
    }, 2000);
  }

  if (output.includes('NEXT_PUBLIC_') && !sentPrefix) {
    sentPrefix = true;
    setTimeout(() => child.stdin.write('\n'), 1500);
  }
});

child.stderr.on('data', (d) => {
  process.stderr.write(d);
});

child.on('close', (code) => {
  console.log('\nDone! Exit code:', code);
  process.exit(code || 0);
});

setTimeout(() => {
  console.log('\nTimeout');
  child.kill();
  process.exit(1);
}, 120000);
