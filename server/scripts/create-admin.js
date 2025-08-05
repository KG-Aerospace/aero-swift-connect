const bcrypt = require('bcryptjs');

async function createAdmin() {
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  console.log('Creating admin user...');
  console.log('Username: admin');
  console.log('Password: admin123');
  console.log('Hashed password:', hashedPassword);
  console.log('\nSQL to create admin user:');
  console.log(`
INSERT INTO users (id, username, password, name, role)
VALUES (
  'admin-user-001',
  'admin',
  '${hashedPassword}',
  'System Administrator',
  'admin'
) ON CONFLICT (id) DO UPDATE SET
  password = '${hashedPassword}',
  name = 'System Administrator',
  role = 'admin';
  `);
}

createAdmin();
