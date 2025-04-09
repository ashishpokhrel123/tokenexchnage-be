
/**
 * Manages nonce values for Ethereum transactions to prevent conflicts.
 */
class NonceManager {
  constructor(provider, wallet) {
    if (!provider || !wallet) {
      throw new Error("Provider and wallet are required for NonceManager");
    }
    this.provider = provider; 
    this.wallet = wallet;    
    this.pendingNonce = null; 
  }

  /**
   * Gets the next available nonce, ensuring uniqueness for transactions.
   * @returns {Promise<number>} The next nonce value.
   */
  async getNextNonce() {
    if (this.pendingNonce === null) {
      // Fetch the pending transaction count from the blockchain
      this.pendingNonce = await this.provider.getTransactionCount(this.wallet.address, "pending");
    }
    const nonce = this.pendingNonce;
    this.pendingNonce += 1; // Increment for the next transaction
    console.log(`[NonceManager] Assigned nonce: ${nonce}`);
    return nonce;
  }

  /**
   * Resets the nonce tracker, forcing a fresh fetch on the next call.
   */
  resetNonce() {
    this.pendingNonce = null;
    console.log("[NonceManager] Nonce reset");
  }

  /**
   * Executes a transaction with nonce management.
   * @param {Function} txFunction - The async function that submits the transaction (e.g., contract call).
   * @param {Object} [options={}] - Additional transaction options (e.g., gasLimit).
   * @returns {Promise<Object>} The transaction receipt.
   */
  async executeTransaction(txFunction, options = {}) {
    try {
      const nonce = await this.getNextNonce();
      const tx = await txFunction({ ...options, nonce });
      const receipt = await tx.wait();
      this.resetNonce(); // Reset after successful confirmation
      return receipt;
    } catch (error) {
      this.resetNonce(); // Reset on failure to resync
      throw error;       // Re-throw for caller to handle
    }
  }
}

module.exports = {
  NonceManager,
};