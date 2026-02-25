const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist');
const oldNodeModulesDir = path.join(distDir, 'assets', 'node_modules');
const newNodeModulesDir = path.join(distDir, 'assets', 'node-modules');

// 1. Rename the directory if it exists
if (fs.existsSync(oldNodeModulesDir)) {
    console.log('[Cloudflare Pages Fix] Renaming assets/node_modules to assets/node-modules...');
    fs.renameSync(oldNodeModulesDir, newNodeModulesDir);
} else {
    console.log('[Cloudflare Pages Fix] No assets/node_modules found. Skipping directory rename.');
}

// 2. Recursively find and replace "assets/node_modules" strings in all JS/HTML/CSS files
const walkSync = function (dir, filelist) {
    const files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function (file) {
        if (fs.statSync(dir + '/' + file).isDirectory()) {
            filelist = walkSync(dir + '/' + file, filelist);
        } else {
            filelist.push(dir + '/' + file);
        }
    });
    return filelist;
};

if (fs.existsSync(distDir)) {
    console.log('[Cloudflare Pages Fix] Rewriting asset paths in JS files...');
    const allFiles = walkSync(distDir);
    let rewriteCount = 0;

    allFiles.forEach(file => {
        // Only target web JS bundles (or mapping files if any)
        if (file.endsWith('.js') || file.endsWith('.map')) {
            let content = fs.readFileSync(file, 'utf8');
            if (content.includes('assets/node_modules')) {
                // Perform global replacement of the path string
                content = content.replace(/assets\/node_modules/g, 'assets/node-modules');
                fs.writeFileSync(file, content, 'utf8');
                rewriteCount++;
            }
        }
    });
    console.log(`[Cloudflare Pages Fix] Success! Rewrote paths in ${rewriteCount} files.`);
} else {
    console.log('[Cloudflare Pages Fix] /dist directory not found. Did you run the build command first?');
}
