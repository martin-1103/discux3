#!/usr/bin/env node

/**
 * Initialize Qdrant collection for Discux3
 */

const { QdrantClient } = require('@qdrant/js-client-rest')

async function initializeQdrant() {
  try {
    console.log('🚀 Initializing Qdrant collection...')

    // Connect to Qdrant
    const client = new QdrantClient({
      url: process.env.QDRANT_URL || "http://localhost:6333",
      apiKey: process.env.QDRANT_API_KEY
    })

    const collectionName = process.env.QDRANT_COLLECTION || "discux3_conversations"

    // Check if collection exists
    console.log('📋 Checking existing collections...')
    const collections = await client.getCollections()
    const exists = collections.collections.some(c => c.name === collectionName)

    if (exists) {
      console.log(`✅ Collection "${collectionName}" already exists`)
      return
    }

    // Create collection with correct embedding dimension (768 for text-embedding-004)
    console.log(`📦 Creating collection "${collectionName}"...`)
    await client.createCollection(collectionName, {
      vectors: {
        size: 768, // Google text-embedding-004 dimension
        distance: "Cosine"
      }
    })

    console.log(`✅ Successfully created collection "${collectionName}"`)

    // Get collection info to confirm
    const collectionInfo = await client.getCollection(collectionName)
    console.log(`📊 Collection info:`)
    console.log(`   - Name: ${collectionInfo.name}`)
    console.log(`   - Vector size: ${collectionInfo.config.params.vectors.size}`)
    console.log(`   - Distance: ${collectionInfo.config.params.vectors.distance}`)
    console.log(`   - Points count: ${collectionInfo.points_count || 0}`)

  } catch (error) {
    console.error('❌ Error initializing Qdrant:', error)
    process.exit(1)
  }
}

// Run initialization
initializeQdrant()