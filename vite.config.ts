import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the built site can be hosted from any path (GitHub Pages, S3, a folder).
export default defineConfig({ base: './', plugins: [react()] });
