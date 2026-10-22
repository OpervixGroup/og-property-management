const {createHash} = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// Source only: never hash credentials, runtime records, .git or prior build output.
function sourceDeploymentId(root) {
  const hash = createHash('sha256');
  const visit = relative => {
    // GoDaddy keeps uploaded public/assets across releases; it is runtime data.
    if (relative === 'public/assets') return;
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) return;
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) throw new Error('Deployment inputs must not be symlinks');
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(absolute).sort()) visit(relative + '/' + name);
    } else if (stat.isFile()) {
      const bytes = fs.readFileSync(absolute);
      hash.update(relative + '\0' + bytes.length + '\0');
      hash.update(bytes);
    }
  };
  for (const input of ['app','components','hooks','lib','public','scripts','next.config.ts','package.json','package-lock.json','tsconfig.json','proxy.ts','instrumentation.ts','postcss.config.mjs']) visit(input);
  return 'og-' + hash.digest('hex').slice(0, 24);
}
module.exports = {sourceDeploymentId};
