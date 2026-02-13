
import bcrypt from 'bcryptjs';

async function test() {
    const pass = 'admin123';
    const hash = bcrypt.hashSync(pass, 10);
    console.log('Hash:', hash);
    const match = await bcrypt.compare(pass, hash);
    console.log('Match:', match);

    // Test with a hash that might be stored in DB
    const dbHash = bcrypt.hashSync('admin123', 10);
    const dbMatch = await bcrypt.compare('admin123', dbHash);
    console.log('DB Match:', dbMatch);
}

test();
