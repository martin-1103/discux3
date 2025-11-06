/**
 * ID Mapping Service for Qdrant Integration
 * Handles bidirectional conversion between cuid2 and UUID formats
 * 
 * Problem: Qdrant requires UUID or unsigned integer IDs, but our app uses cuid2
 * Solution: Deterministic UUID generation with database-backed bidirectional mapping
 */

import crypto from 'crypto'
import { prisma } from './db'

/**
 * ID Mapper class for converting between cuid2 and UUID formats
 */
export class IdMapper {
  private salt: string
  private cache: Map<string, string> = new Map()
  private reverseCache: Map<string, string> = new Map()
  private readonly CACHE_MAX_SIZE = 10000 // Prevent unlimited memory growth

  constructor() {
    this.salt = process.env.UUID_SALT || 'discux3-default-salt'
    
    if (process.env.UUID_SALT === undefined) {
      console.warn('UUID_SALT environment variable not set. Using default salt. Generate one with: openssl rand -hex 32')
    }
  }

  /**
   * Convert cuid2 to UUID for Qdrant storage
   * Uses deterministic hash + database storage for consistency
   */
  async cuidToUuid(cuid: string): Promise<string> {
    // Check cache first for performance
    if (this.cache.has(cuid)) {
      return this.cache.get(cuid)!
    }

    try {
      // Check database for existing mapping
      const mapping = await prisma.vectorIdMapping.findUnique({
        where: { cuidId: cuid }
      })

      if (mapping) {
        this.setCached(cuid, mapping.qdrantUuid)
        return mapping.qdrantUuid
      }

      // Generate new deterministic UUID
      const uuid = this.generateDeterministicUuid(cuid)

      // Store mapping asynchronously (fire and forget for performance)
      this.storeMappingAsync(cuid, uuid)

      // Cache immediately
      this.setCached(cuid, uuid)

      return uuid
    } catch (error) {
      // Fallback to deterministic generation if database fails
      console.error('Error in cuidToUuid, falling back to deterministic generation:', error)
      return this.generateDeterministicUuid(cuid)
    }
  }

  /**
   * Convert UUID back to cuid2 for application use
   */
  async uuidToCuid(uuid: string): Promise<string | null> {
    // Check reverse cache first
    if (this.reverseCache.has(uuid)) {
      return this.reverseCache.get(uuid)!
    }

    try {
      // Check database
      const mapping = await prisma.vectorIdMapping.findUnique({
        where: { qdrantUuid: uuid }
      })

      if (mapping) {
        this.setCached(mapping.cuidId, mapping.qdrantUuid)
        return mapping.cuidId
      }

      return null
    } catch (error) {
      console.error('Error in uuidToCuid:', error)
      return null
    }
  }

  /**
   * Batch conversion of cuid2 to UUID for performance
   * Minimizes database round trips
   */
  async batchCuidToUuid(cuids: string[]): Promise<string[]> {
    const results: string[] = []
    const uncached: string[] = []
    const uncachedIndices: number[] = []

    // Separate cached from uncached
    for (let i = 0; i < cuids.length; i++) {
      const cuid = cuids[i]
      if (this.cache.has(cuid)) {
        results[i] = this.cache.get(cuid)!
      } else {
        uncached.push(cuid)
        uncachedIndices.push(i)
      }
    }

    if (uncached.length === 0) {
      return results
    }

    try {
      // Batch fetch from database
      const mappings = await prisma.vectorIdMapping.findMany({
        where: { cuidId: { in: uncached } }
      })

      const mappingMap = new Map(mappings.map(m => [m.cuidId, m.qdrantUuid]))

      // Process uncached items
      const toStore: Array<{ cuidId: string; qdrantUuid: string }> = []

      for (let i = 0; i < uncached.length; i++) {
        const cuid = uncached[i]
        const resultIndex = uncachedIndices[i]

        if (mappingMap.has(cuid)) {
          const uuid = mappingMap.get(cuid)!
          results[resultIndex] = uuid
          this.setCached(cuid, uuid)
        } else {
          // Generate deterministic UUID
          const uuid = this.generateDeterministicUuid(cuid)
          results[resultIndex] = uuid
          this.setCached(cuid, uuid)
          toStore.push({ cuidId: cuid, qdrantUuid: uuid })
        }
      }

      // Batch store new mappings asynchronously
      if (toStore.length > 0) {
        this.batchStoreMappingsAsync(toStore)
      }

      return results
    } catch (error) {
      console.error('Error in batchCuidToUuid, falling back to deterministic generation:', error)
      
      // Fallback: generate deterministic UUIDs for all uncached items
      for (let i = 0; i < uncached.length; i++) {
        const cuid = uncached[i]
        const resultIndex = uncachedIndices[i]
        results[resultIndex] = this.generateDeterministicUuid(cuid)
      }

      return results
    }
  }

  /**
   * Generate deterministic UUID from cuid2 using SHA-256 hash
   * Same input always produces same UUID
   */
  private generateDeterministicUuid(cuid: string): string {
    const hash = crypto.createHash('sha256')
      .update(cuid + this.salt)
      .digest('hex')

    // Format as UUID v4 (8-4-4-4-12 format)
    return [
      hash.substring(0, 8),
      hash.substring(8, 12),
      hash.substring(12, 16),
      hash.substring(16, 20),
      hash.substring(20, 32)
    ].join('-')
  }

  /**
   * Store mapping in database asynchronously (fire and forget)
   */
  private storeMappingAsync(cuidId: string, qdrantUuid: string): void {
    prisma.vectorIdMapping.create({
      data: { cuidId, qdrantUuid }
    }).catch(error => {
      // Ignore unique constraint violations (race condition)
      if (!(error instanceof Error && error.message.includes('Unique constraint'))) {
        console.error('Error storing ID mapping:', error)
      }
    })
  }

  /**
   * Batch store mappings in database asynchronously
   */
  private batchStoreMappingsAsync(mappings: Array<{ cuidId: string; qdrantUuid: string }>): void {
    prisma.vectorIdMapping.createMany({
      data: mappings,
      skipDuplicates: true // Handle race conditions gracefully
    }).catch(error => {
      console.error('Error batch storing ID mappings:', error)
    })
  }

  /**
   * Set cache with size limit enforcement
   */
  private setCached(cuid: string, uuid: string): void {
    // Implement simple cache eviction if size limit reached
    if (this.cache.size >= this.CACHE_MAX_SIZE) {
      // Remove oldest entries (first 1000 entries)
      const keysToDelete = Array.from(this.cache.keys()).slice(0, 1000)
      keysToDelete.forEach(key => {
        const value = this.cache.get(key)
        this.cache.delete(key)
        if (value) {
          this.reverseCache.delete(value)
        }
      })
    }

    this.cache.set(cuid, uuid)
    this.reverseCache.set(uuid, cuid)
  }

  /**
   * Clear cache (useful for testing or memory management)
   */
  clearCache(): void {
    this.cache.clear()
    this.reverseCache.clear()
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.CACHE_MAX_SIZE,
      hitRate: 0 // TODO: Implement hit rate tracking if needed
    }
  }
}

// Global instance
let idMapper: IdMapper | null = null

/**
 * Get or create global ID mapper instance
 */
export function getIdMapper(): IdMapper {
  if (!idMapper) {
    idMapper = new IdMapper()
  }
  return idMapper
}

/**
 * Reset ID mapper instance (useful for testing)
 */
export function resetIdMapper(): void {
  idMapper = null
}
