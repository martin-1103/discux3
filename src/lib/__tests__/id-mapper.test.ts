/**
 * Unit tests for ID Mapper Service
 * Tests deterministic UUID generation and caching behavior
 */

import { IdMapper, getIdMapper, resetIdMapper } from '../id-mapper'

// Mock Prisma client
jest.mock('../db', () => ({
  prisma: {
    vectorIdMapping: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn()
    }
  }
}))

import { prisma } from '../db'

describe('IdMapper', () => {
  let mapper: IdMapper

  beforeEach(() => {
    mapper = new IdMapper()
    mapper.clearCache()
    jest.clearAllMocks()
  })

  describe('Deterministic UUID Generation', () => {
    it('should generate consistent UUIDs for same input', async () => {
      const cuid = 'testcuid123'

      // Mock database to return null (no existing mapping)
      ;(prisma.vectorIdMapping.findUnique as jest.Mock).mockResolvedValue(null)

      const uuid1 = await mapper.cuidToUuid(cuid)
      
      // Clear cache to force regeneration
      mapper.clearCache()
      ;(prisma.vectorIdMapping.findUnique as jest.Mock).mockResolvedValue(null)
      
      const uuid2 = await mapper.cuidToUuid(cuid)

      expect(uuid1).toBe(uuid2)
      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })

    it('should generate different UUIDs for different inputs', async () => {
      ;(prisma.vectorIdMapping.findUnique as jest.Mock).mockResolvedValue(null)

      const uuid1 = await mapper.cuidToUuid('cuid1')
      const uuid2 = await mapper.cuidToUuid('cuid2')

      expect(uuid1).not.toBe(uuid2)
    })

    it('should generate valid UUID v4 format', async () => {
      ;(prisma.vectorIdMapping.findUnique as jest.Mock).mockResolvedValue(null)

      const uuid = await mapper.cuidToUuid('testcuid')

      // UUID v4 format: 8-4-4-4-12 hex characters
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      expect(uuid).toMatch(uuidRegex)
    })
  })

  describe('Cache Behavior', () => {
    it('should use cache for repeated conversions', async () => {
      const cuid = 'testcuid123'
      ;(prisma.vectorIdMapping.findUnique as jest.Mock).mockResolvedValue(null)

      // First call - should hit database
      await mapper.cuidToUuid(cuid)
      expect(prisma.vectorIdMapping.findUnique).toHaveBeenCalledTimes(1)

      // Second call - should use cache
      await mapper.cuidToUuid(cuid)
      expect(prisma.vectorIdMapping.findUnique).toHaveBeenCalledTimes(1) // Still 1, not 2
    })

    it('should support cache clearing', async () => {
      const cuid = 'testcuid123'
      ;(prisma.vectorIdMapping.findUnique as jest.Mock).mockResolvedValue(null)

      await mapper.cuidToUuid(cuid)
      mapper.clearCache()
      await mapper.cuidToUuid(cuid)

      expect(prisma.vectorIdMapping.findUnique).toHaveBeenCalledTimes(2)
    })

    it('should provide cache statistics', () => {
      const stats = mapper.getCacheStats()

      expect(stats).toHaveProperty('size')
      expect(stats).toHaveProperty('maxSize')
      expect(stats).toHaveProperty('hitRate')
      expect(typeof stats.size).toBe('number')
      expect(typeof stats.maxSize).toBe('number')
    })
  })

  describe('Database Integration', () => {
    it('should retrieve existing mapping from database', async () => {
      const cuid = 'existingcuid'
      const expectedUuid = '12345678-1234-1234-1234-123456789abc'

      ;(prisma.vectorIdMapping.findUnique as jest.Mock).mockResolvedValue({
        cuidId: cuid,
        qdrantUuid: expectedUuid
      })

      const uuid = await mapper.cuidToUuid(cuid)

      expect(uuid).toBe(expectedUuid)
      expect(prisma.vectorIdMapping.findUnique).toHaveBeenCalledWith({
        where: { cuidId: cuid }
      })
    })

    it('should handle database errors gracefully', async () => {
      const cuid = 'testcuid'
      ;(prisma.vectorIdMapping.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      )

      // Should fallback to deterministic generation
      const uuid = await mapper.cuidToUuid(cuid)

      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })
  })

  describe('Reverse Mapping', () => {
    it('should convert UUID back to cuid2', async () => {
      const cuid = 'originalcuid'
      const uuid = '12345678-1234-1234-1234-123456789abc'

      ;(prisma.vectorIdMapping.findUnique as jest.Mock).mockResolvedValue({
        cuidId: cuid,
        qdrantUuid: uuid
      })

      const result = await mapper.uuidToCuid(uuid)

      expect(result).toBe(cuid)
      expect(prisma.vectorIdMapping.findUnique).toHaveBeenCalledWith({
        where: { qdrantUuid: uuid }
      })
    })

    it('should return null for non-existent UUID', async () => {
      ;(prisma.vectorIdMapping.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await mapper.uuidToCuid('nonexistent-uuid')

      expect(result).toBeNull()
    })

    it('should handle database errors in reverse mapping', async () => {
      ;(prisma.vectorIdMapping.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database error')
      )

      const result = await mapper.uuidToCuid('some-uuid')

      expect(result).toBeNull()
    })
  })

  describe('Batch Operations', () => {
    it('should convert multiple cuid2s efficiently', async () => {
      const cuids = Array.from({ length: 100 }, (_, i) => `cuid${i}`)
      
      ;(prisma.vectorIdMapping.findMany as jest.Mock).mockResolvedValue([])

      const uuids = await mapper.batchCuidToUuid(cuids)

      expect(uuids).toHaveLength(100)
      expect(uuids[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
      
      // Should only hit database once for batch
      expect(prisma.vectorIdMapping.findMany).toHaveBeenCalledTimes(1)
    })

    it('should handle mixed cached and uncached items', async () => {
      const cuids = ['cached1', 'uncached1', 'uncached2']
      
      // Pre-populate cache with one item
      ;(prisma.vectorIdMapping.findUnique as jest.Mock).mockResolvedValue(null)
      await mapper.cuidToUuid('cached1')
      
      // Mock batch query
      ;(prisma.vectorIdMapping.findMany as jest.Mock).mockResolvedValue([])

      const uuids = await mapper.batchCuidToUuid(cuids)

      expect(uuids).toHaveLength(3)
      // Should only query for uncached items
      expect(prisma.vectorIdMapping.findMany).toHaveBeenCalledWith({
        where: { cuidId: { in: ['uncached1', 'uncached2'] } }
      })
    })

    it('should handle batch operation errors gracefully', async () => {
      const cuids = ['cuid1', 'cuid2', 'cuid3']
      
      ;(prisma.vectorIdMapping.findMany as jest.Mock).mockRejectedValue(
        new Error('Batch query failed')
      )

      // Should fallback to deterministic generation
      const uuids = await mapper.batchCuidToUuid(cuids)

      expect(uuids).toHaveLength(3)
      uuids.forEach(uuid => {
        expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
      })
    })

    it('should complete batch operations quickly', async () => {
      const cuids = Array.from({ length: 1000 }, (_, i) => `cuid${i}`)
      
      ;(prisma.vectorIdMapping.findMany as jest.Mock).mockResolvedValue([])

      const start = Date.now()
      await mapper.batchCuidToUuid(cuids)
      const duration = Date.now() - start

      // Should complete in reasonable time (< 1 second for 1000 items)
      expect(duration).toBeLessThan(1000)
    })
  })

  describe('Global Instance Management', () => {
    it('should return same instance from getIdMapper', () => {
      const instance1 = getIdMapper()
      const instance2 = getIdMapper()

      expect(instance1).toBe(instance2)
    })

    it('should create new instance after reset', () => {
      const instance1 = getIdMapper()
      resetIdMapper()
      const instance2 = getIdMapper()

      expect(instance1).not.toBe(instance2)
    })
  })

  describe('Environment Configuration', () => {
    it('should use UUID_SALT from environment', async () => {
      process.env.UUID_SALT = 'custom-test-salt'
      const customMapper = new IdMapper()
      
      ;(prisma.vectorIdMapping.findUnique as jest.Mock).mockResolvedValue(null)

      const uuid1 = await customMapper.cuidToUuid('test')
      
      // Change salt
      process.env.UUID_SALT = 'different-salt'
      const differentMapper = new IdMapper()
      
      ;(prisma.vectorIdMapping.findUnique as jest.Mock).mockResolvedValue(null)
      
      const uuid2 = await differentMapper.cuidToUuid('test')

      // Different salts should produce different UUIDs
      expect(uuid1).not.toBe(uuid2)
    })

    it('should use default salt when UUID_SALT not set', async () => {
      delete process.env.UUID_SALT
      const defaultMapper = new IdMapper()
      
      ;(prisma.vectorIdMapping.findUnique as jest.Mock).mockResolvedValue(null)

      const uuid = await defaultMapper.cuidToUuid('test')

      // Should still generate valid UUID
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string input', async () => {
      ;(prisma.vectorIdMapping.findUnique as jest.Mock).mockResolvedValue(null)

      const uuid = await mapper.cuidToUuid('')

      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })

    it('should handle very long cuid input', async () => {
      const longCuid = 'a'.repeat(1000)
      ;(prisma.vectorIdMapping.findUnique as jest.Mock).mockResolvedValue(null)

      const uuid = await mapper.cuidToUuid(longCuid)

      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })

    it('should handle special characters in cuid', async () => {
      const specialCuid = 'cuid-with-special-chars-!@#$%^&*()'
      ;(prisma.vectorIdMapping.findUnique as jest.Mock).mockResolvedValue(null)

      const uuid = await mapper.cuidToUuid(specialCuid)

      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })

    it('should handle empty batch array', async () => {
      const uuids = await mapper.batchCuidToUuid([])

      expect(uuids).toHaveLength(0)
      expect(prisma.vectorIdMapping.findMany).not.toHaveBeenCalled()
    })
  })
})
