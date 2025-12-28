// Quick script to create an initial user
// Run with: node scripts/create-user.js

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter email: ', (email) => {
  rl.question('Enter password: ', (password) => {
    rl.question('Enter name (optional): ', (name) => {
      const hash = bcrypt.hashSync(password, 10);
      
      console.log('\n=== User Creation SQL ===\n');
      console.log(`INSERT INTO "User" (id, email, password, name, "createdAt", "updatedAt")`);
      console.log(`VALUES (gen_random_uuid()::text, '${email}', '${hash}', ${name ? `'${name}'` : 'NULL'}, NOW(), NOW());`);
      console.log('\n=== Or use this hash in Prisma Studio ===\n');
      console.log(`Password hash: ${hash}\n`);
      
      rl.close();
    });
  });
});

