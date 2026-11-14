const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'build', 'swc', 'index.js');

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');
  const brokenPattern = `if (importPath) {
                    // the import path must be exact when not in node_modules
                    pkgPath = _path.default.join(importPath, pkg, 'wasm.js');
                }`;
  const replacement = `if (importPath) {
                    pkgPath = _path.default.join(importPath, pkg, 'wasm.js');
                } else {
                    pkgPath = require.resolve(pkg + '/wasm.js');
                }`;

  if (content.includes(brokenPattern)) {
    content = content.replace(brokenPattern, replacement);
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('✓ Successfully patched Next.js SWC WASM loader in node_modules/next/dist/build/swc/index.js');
  } else {
    console.log('✓ Next.js SWC WASM loader already patched');
  }
}

