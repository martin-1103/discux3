const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixAgentStyles() {
  try {
    console.log('🔧 Fixing agent styles in database using raw SQL...');

    // Use raw SQL to update agents with empty style
    const result = await prisma.$executeRaw`UPDATE Agent SET style = 'TRUTH_TELLER' WHERE style = '' OR style IS NULL`;

    console.log(`✅ Updated ${result.count} agents with empty/null style to TRUTH_TELLER`);

    // Check all agents after update
    const allAgents = await prisma.$queryRaw`SELECT id, name, style FROM Agent`;
    console.log('📊 Current agents in database:');
    allAgents.forEach(agent => {
      console.log(`  - ${agent.name}: "${agent.style}" ${agent.style === '' || agent.style === null ? '(⚠️ EMPTY!)' : '✅'}`);
    });

    console.log('🎉 Agent style fix completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing agent styles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAgentStyles();