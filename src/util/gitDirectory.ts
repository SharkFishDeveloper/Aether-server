import  fs from "fs";
import  path from "path";

const EXCLUDED_DIRS = new Set([
    '.git', 'node_modules', '.DS_Store', 'dist', 'build', '.next', 'out',
    '.env', '.env.local', '.env.production', '.env.development', '.env.test',
    '.gitignore', '.dockerignore', 'Dockerfile',
    'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb',
    'tsconfig.json', 'jsconfig.json', 'babel.config.js', '.eslintrc.js', '.prettierrc', '.eslintignore',
    'logs', 'temp', 'tmp', 'npm-debug.log', 'yarn-error.log', 'debug.log',
    '.next', 'next.config.js', 'postcss.config.js', 'tailwind.config.js', 'react-loadable-manifest.json',
    'prisma', 'prisma/migrations', 'prisma/dev.db', 'prisma/schema.prisma',
    '.vscode', '.idea', '.cache',
    'coverage', 'jest.config.js', 'jest.setup.js', '__tests__', '__mocks__',
    'README.md', 'LICENSE', 'CHANGELOG.md'
]);


export function generateTree(dir: string, prefix = ''): string {
    if (!fs.existsSync(dir)) return '';

    const items = fs.readdirSync(dir, { withFileTypes: true })
        .filter(item => !EXCLUDED_DIRS.has(item.name));

    let tree = '';

    items.forEach((item, index) => {
        const isLast = index === items.length - 1;
        const branch = `${prefix}${isLast ? '└──' : '├──'} ${item.name}\n`;
        tree += branch;
        
        if (item.isDirectory()) {
            tree += generateTree(path.join(dir, item.name), `${prefix}${isLast ? '    ' : '│   '}`);
        }
    });

    return tree;
}
