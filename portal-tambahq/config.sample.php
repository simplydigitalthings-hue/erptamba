<?php
/**
 * Tambahq Portal Environment Configuration Template
 *
 * INSTRUCTIONS:
 * 1. Copy this file to `config.php` in the same directory:
 *    cp config.sample.php config.php
 * 2. Fill in the values for your specific environment (Beta vs Production).
 * 3. `config.php` is git-ignored and should NEVER be committed to Git.
 */

return [
    // Environment identifier: 'production' | 'beta' | 'local'
    'APP_ENV' => 'beta',

    // Display version tag shown as subtle badge in Beta mode
    'APP_VERSION' => 'v2.0-beta',

    // Base domain for workspaces:
    // Production: 'tambahq.in'
    // Beta: 'beta.tambahq.in'
    'BASE_DOMAIN' => 'beta.tambahq.in',

    // Neon Database Connection String:
    // Use the Beta branch pooler string for Beta, and the main branch string for Production.
    'NEON_DB_URL' => 'postgresql://neondb_owner:npg_cDAhNC0Y6Epu@ep-holy-union-az9dr80o-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',

    // Neon HTTP SQL API Endpoint:
    // https://<project-endpoint-id>.c-3.ap-southeast-1.aws.neon.tech/sql
    'NEON_ENDPOINT' => 'https://ep-holy-union-az9dr80o.c-3.ap-southeast-1.aws.neon.tech/sql',
];
