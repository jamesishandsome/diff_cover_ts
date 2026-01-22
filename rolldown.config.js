import { defineConfig } from 'rolldown';
import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  'fs', 'path', 'child_process', 'util', 'os', 'stream'
];

export default defineConfig({
  input: {
    'diff-cover': 'src/diff_cover_tool.ts',
    'diff-quality': 'src/diff_quality_tool.ts'
  },
  output: {
    dir: 'dist',
    format: 'esm',
    banner: '#!/usr/bin/env node',
  },
  platform: 'node',
  external,
});
