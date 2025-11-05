/**
 * Migration script to create UUID mappings for existing messages
 * 
 * This script:
 * 1. Fetches all existing messages from the database
 * 2. Generates UUID mappings for each message ID (cuid2)
 * 3. Stores mappings in the vector_id_mappings table
 * 4. Processes in batches to avoid memory issues
 * 
 * Usage:
 *   npm run migrate:vectors
 * 
 * Prerequisites:
 *   - Database must be running
 *   - Prisma schema must be up-to-date
 *   - UUID_SALT environment variable should be set
 */

import { prisma } from '../src/lib/db'
import { getIdMapper } from '../src/lib/id-mapper'

interface MigrationStats {
  totalMessages: number
  existingMappings: number
  newMappings: number
  errors: number
  startTime: Date
  endTime?: Date
}

async function migrateExistingMessages(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║     Qdrant ID Migration - Vector ID Mapping Generator     ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log('')

  const stats: MigrationStats = {
    totalMessages: 0,
    existingMappings: 0,
    newMappings: 0,
    errors: 0,
    startTime: new Date()
  }

  const idMapper = getIdMapper()

  try {
    // Step 1: Check environment
    console.log('📋 Pre-flight checks...')
    if (!process.env.UUID_SALT) {
      console.warn('⚠️  WARNING: UUID_SALT not set. Using default salt.')
      console.warn('   Generate one with: openssl rand -hex 32')
      console.log('')
    }

    // Step 2: Get all messages
    console.log('📊 Fetching messages from database...')
    const messages = await prisma.message.findMany({
      select: { id: true }
    })

    stats.totalMessages = messages.length
    console.log(`✅ Found ${stats.totalMessages} messages`)
    console.log('')

    if (messages.length === 0) {
      console.log('ℹ️  No messages found. Nothing to migrate.')
      return
    }

    // Step 3: Check for existing mappings
    console.log('🔍 Checking for existing mappings...')
    const existingMappings = await prisma.vectorIdMapping.count()
    stats.existingMappings = existingMappings
    console.log(`✅ Found ${existingMappings} existing mappings`)
    console.log('')

    // Step 4: Process in batches
    const batchSize = 1000
    const totalBatches = Math.ceil(messages.length / batchSize)
    
    console.log(`🔄 Processing ${stats.totalMessages} messages in ${totalBatches} batches...`)
    console.log('')

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1

      process.stdout.write(`   Batch ${batchNumber}/${totalBatches}: Processing ${batch.length} messages... `)

      try {
        // Generate UUID mappings for batch
        const cuids = batch.map(m => m.id)
        await idMapper.batchCuidToUuid(cuids)

        stats.newMappings += batch.length
        console.log('✅ Done')
      } catch (error) {
        stats.errors += batch.length
        console.log('❌ Failed')
        console.error(`   Error details:`, error)
      }
    }

    console.log('')
    console.log('═════════════════════════════════════════════════════════════')
    console.log('                     Migration Complete!                     ')
    console.log('═════════════════════════════════════════════════════════════')
    
    stats.endTime = new Date()
    const duration = (stats.endTime.getTime() - stats.startTime.getTime()) / 1000

    console.log('')
    console.log('📊 Migration Statistics:')
    console.log(`   Total Messages:      ${stats.totalMessages}`)
    console.log(`   Existing Mappings:   ${stats.existingMappings}`)
    console.log(`   New Mappings:        ${stats.newMappings}`)
    console.log(`   Errors:              ${stats.errors}`)
    console.log(`   Duration:            ${duration.toFixed(2)}s`)
    console.log('')

    // Step 5: Verify migration
    console.log('🔍 Verifying migration...')
    const finalMappingCount = await prisma.vectorIdMapping.count()
    console.log(`✅ Total mappings in database: ${finalMappingCount}`)
    
    if (finalMappingCount >= stats.totalMessages) {
      console.log('✅ Migration successful!')
    } else {
      console.warn(`⚠️  Warning: Expected at least ${stats.totalMessages} mappings, found ${finalMappingCount}`)
    }

    console.log('')
    console.log('🎉 Next steps:')
    console.log('   1. Set FEATURE_UUID_MAPPING=true in .env')
    console.log('   2. Restart your application')
    console.log('   3. Test vector storage functionality')
    console.log('')

  } catch (error) {
    console.error('')
    console.error('❌ Migration failed with error:')
    console.error(error)
    console.error('')
    console.error('💡 Troubleshooting:')
    console.error('   1. Check database connection')
    console.error('   2. Ensure Prisma schema is up-to-date (npm run db:generate)')
    console.error('   3. Verify database migrations are applied')
    console.error('')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateExistingMessages()
    .then(() => {
      console.log('✅ Script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Script failed:', error)
      process.exit(1)
    })
}

export { migrateExistingMessages }
