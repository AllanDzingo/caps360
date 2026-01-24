const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const distDir = path.resolve(__dirname, 'dist');
const outputZip = path.resolve(__dirname, '..', 'backend.zip');

// Remove old zip if exists
if (fs.existsSync(outputZip)) {
  fs.unlinkSync(outputZip);
}

const output = fs.createWriteStream(outputZip);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`Created ${outputZip} (${archive.pointer()} total bytes)`);
});

archive.on('error', err => {
  throw err;
});

archive.pipe(output);

// Recursively add dist/ files with forward slashes
function addDirToArchive(dir, base = '') {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    const relPath = path.posix.join(base, file); // Always use posix (forward slash)
    if (fs.statSync(fullPath).isDirectory()) {
      addDirToArchive(fullPath, relPath);
    } else {
      archive.file(fullPath, { name: relPath });
    }
  });
}

addDirToArchive(distDir);
archive.finalize();
