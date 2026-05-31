const major = Number(process.versions.node.split(".")[0]);

if (major < 20) {
    console.error(
        `\nNode.js ${process.version} is too old for this project (Vite 6 needs Node 20+).\n` +
            `Your shell is likely using system Node instead of nvm.\n\n` +
            `Fix:\n` +
            `  nvm use\n` +
            `  npm run dev\n\n` +
            `(Install nvm Node 22 if needed: nvm install 22)\n`,
    );
    process.exit(1);
}
