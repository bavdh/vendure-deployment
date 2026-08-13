import { runMigrations } from '@vendure/core';
import { config } from './vendure-config';

runMigrations(config)
    .then(() => {
        console.log('Database migrations completed successfully');
    })
    .catch(err => {
        console.error('Database migration failed', err);
        process.exit(1);
    });