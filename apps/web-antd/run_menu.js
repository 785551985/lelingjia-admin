import fs from 'fs';
import pg from 'pg';

const { Client } = pg;
const client = new Client({
  user: 'postgres',
  password: '123',
  host: 'localhost',
  port: 5432,
  database: 'ruoyi-ai',
});

async function main() {
  await client.connect();
  const sql = fs.readFileSync('C:/Users/Administrator/.gemini/antigravity-ide/brain/e0c18594-a5d2-4fc2-9d01-0f66ec9297ee/scratch/update_menu.sql', 'utf8');
  await client.query(sql);
  console.log('Successfully updated sys_menu table with Knowledge Center menu tree!');
  await client.end();
}

main().catch(console.error);
