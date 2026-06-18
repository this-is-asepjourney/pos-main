const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/app/api/**/*.ts', { cwd: 'd:/pos-main-1', absolute: true });
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  if (content.includes('getDbConnection')) {
    content = content.replace(/import \{ getDbConnection \} from "@\/lib\/db";/g, 'import pool from "@/lib/db";');
    content = content.replace(/const conn = await getDbConnection\(\);/g, 'const conn = pool;');
    content = content.replace(/await conn\.end\(\);/g, '');
    fs.writeFileSync(f, content);
    console.log('Fixed', f);
  }
});
