import dotenv from 'dotenv';
dotenv.config();
import { initDb, readUserData, readOutreachSessions, readMaterialsData, getPoldaList, getPolresList } from '../src/db.js';

async function main() {
  await initDb();
  const userData = readUserData();
  const sessions = readOutreachSessions();
  const materials = readMaterialsData();
  const poldas = getPoldaList();
  const polreses = getPolresList();

  console.log('=== AUDIT DB SUMMARY ===');
  console.log('Total Users:', userData.users.length);
  console.log('Total Roles:', userData.roles.length);
  console.log('Roles:', userData.roles.map(r => ({ id: r.id, name: r.name })));

  // Role distribution
  const roleCount: Record<string, number> = {};
  for (const u of userData.users) {
    roleCount[u.roleId] = (roleCount[u.roleId] || 0) + 1;
  }
  console.log('Role Distribution:', roleCount);

  // Users without polda/polres by role
  console.log('\n=== USERS REGION FIELD AUDIT ===');
  for (const roleId of Object.keys(roleCount)) {
    const usersInRole = userData.users.filter(u => u.roleId === roleId);
    const withPolda = usersInRole.filter(u => Boolean(u.polda)).length;
    const withPolres = usersInRole.filter(u => Boolean(u.polres)).length;
    const sample = usersInRole[0];
    console.log(`Role ${roleId}: total=${usersInRole.length}, withPolda=${withPolda}, withPolres=${withPolres}`);
    if (sample) {
      console.log(`  Sample ${roleId}: id=${sample.id}, user=${sample.username}, polda="${sample.polda}", polres="${sample.polres}", execLevel="${sample.executiveLevel}"`);
    }
  }

  // Sessions audit
  console.log('\n=== OUTREACH SESSIONS REGION AUDIT ===');
  console.log('Total Sessions:', sessions.length);
  if (sessions.length > 0) {
    const sWithPolda = sessions.filter(s => Boolean(s.polda)).length;
    const sWithPolres = sessions.filter(s => Boolean(s.polres)).length;
    console.log(`Sessions: withPolda=${sWithPolda}, withPolres=${sWithPolres}`);
    console.log('Sample session:', {
      id: sessions[0].id,
      trainerId: sessions[0].trainerId,
      polda: sessions[0].polda,
      polres: sessions[0].polres,
      activityName: sessions[0].activityName
    });
  }

  // Materials audit
  console.log('\n=== MATERIALS REGION AUDIT ===');
  console.log('Total Materials:', materials.length);
  if (materials.length > 0) {
    console.log('Sample material keys:', Object.keys(materials[0]));
  }

  // Wilayah Master
  console.log('\n=== WILAYAH MASTER ===');
  console.log('Total Polda:', poldas.length, 'Total Polres:', polreses.length);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

