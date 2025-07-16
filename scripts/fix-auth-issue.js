// Script to help debug and fix authentication issues
console.log('🔧 Trestle Board Authentication Debug Script');
console.log('============================================');

console.log('\n📋 Steps to fix the JWT decryption issue:');
console.log('1. Check your .env file has NEXTAUTH_SECRET set');
console.log('2. Clear your browser cookies and local storage');
console.log('3. Log out and log back in');
console.log('4. Test the meal search functionality');

console.log('\n🔍 Debug endpoints to test:');
console.log('- GET /api/admin/meals/test - Check if meals exist');
console.log('- POST /api/auth/clear-session - Clear corrupted session');
console.log('- GET /api/admin/trestle-board/meals/search - Test meal search');

console.log('\n💡 Common solutions:');
console.log('- Set NEXTAUTH_SECRET in your .env file');
console.log('- Restart your development server');
console.log('- Clear browser cache and cookies');
console.log('- Check if you have meals in the database');

console.log('\n🚀 Quick fix commands:');
console.log('1. Add to .env: NEXTAUTH_SECRET=your-secret-here');
console.log('2. npm run dev (restart server)');
console.log('3. Clear browser data');
console.log('4. Log in again');

console.log('\n✅ After fixing, test these URLs:');
console.log('- http://localhost:3000/api/admin/meals/test');
console.log('- http://localhost:3000/admin/trestle-board/create'); 