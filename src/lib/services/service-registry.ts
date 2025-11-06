/**
 * Service Registry - Centralized service management for cross-module sharing
 */

let socketServiceInstance: any = null

export class ServiceRegistry {
  /**
   * Set socket service instance
   */
  static setSocketService(service: any): void {
    console.log('[ServiceRegistry] Setting socket service instance')
    socketServiceInstance = service
  }

  /**
   * Get socket service instance
   */
  static getSocketService(): any {
    console.log('[ServiceRegistry] getSocketService() called, returning:', socketServiceInstance ? 'instance' : 'null')
    return socketServiceInstance
  }

  /**
   * Check if socket service is available
   */
  static hasSocketService(): boolean {
    return socketServiceInstance !== null
  }
}