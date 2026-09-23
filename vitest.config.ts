import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        env: {
            NODE_ENV: 'test'
        },
        globalSetup: ['./src/test/setup.ts'],
        fileParallelism: false
    }
});