// Utility functions for input validation

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidEthereumAddress(address: string): boolean {
  if (!address.startsWith('0x')) return false;
  if (address.length !== 42) return false;
  
  const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethereumAddressRegex.test(address);
}

export function isValidXRPAddress(address: string): boolean {
  if (!address.startsWith('r')) return false;
  if (address.length < 25 || address.length > 35) return false;
  
  const xrpAddressRegex = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
  return xrpAddressRegex.test(address);
}