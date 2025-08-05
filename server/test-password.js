import bcrypt from 'bcryptjs';

const testPassword = async () => {
  const password = 'admin123';
  const hash = '$2a$10$v3SdZ3iKrMOFyKXVZQxJP.0Xwe8HWh6AECNEoJo.uKFZJoWk4lKGi';
  
  console.log('Testing password:', password);
  console.log('Against hash:', hash);
  
  const isValid = await bcrypt.compare(password, hash);
  console.log('Password is valid:', isValid);
  
  // Generate a new hash
  const newHash = await bcrypt.hash(password, 10);
  console.log('New hash for admin123:', newHash);
};

testPassword();
