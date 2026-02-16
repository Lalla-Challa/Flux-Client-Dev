// This script injects environment variables into the built Electron main process
const fs = require('fs');
const path = require('path');

// Load production environment variables from project root
const projectRoot = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(projectRoot, '.env.production.local') });

const mainJsPath = path.join(projectRoot, 'dist-electron', 'main.js');

if (fs.existsSync(mainJsPath)) {
    let mainJs = fs.readFileSync(mainJsPath, 'utf8');

    // Inject the credentials and NODE_ENV at the top of the file
    const injection = `
// Production environment variables injected at build time
process.env.NODE_ENV = 'production';
process.env.GITHUB_CLIENT_ID = '${process.env.GITHUB_CLIENT_ID || ''}';
process.env.GITHUB_CLIENT_SECRET = '${process.env.GITHUB_CLIENT_SECRET || ''}';
`;

    mainJs = injection + mainJs;
    fs.writeFileSync(mainJsPath, mainJs, 'utf8');
    console.log('✓ Injected production environment variables into main.js');
} else {
    console.log('⚠ main.js not found, skipping environment injection');
}
