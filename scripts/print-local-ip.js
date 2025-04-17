const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

const ip = getLocalIP();
const port = process.env.PORT || 3000;
if (ip) {
  console.log(`\u001b[32mLAN:   http://${ip}:${port}\u001b[0m`);
} else {
  console.log('No LAN IP found.');
}
