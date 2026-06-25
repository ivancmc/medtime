/**
 * Utility function to convert a Base64-encoded VAPID public key to a Uint8Array.
 * This is required by the pushManager.subscribe() method.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// A standard, valid, base64url-encoded VAPID Public Key for demonstration and testing.
// You can replace this key with your own server's VAPID public key in production.
export const DEFAULT_VAPID_PUBLIC_KEY = 'BEl62iCih5tJu5Y9Gszj7E5Albb28gJE8A_8tOQ44s-J9q3N12vW-zH-vK1w_9O34cKjK12-4Uo7hK58-vK_o78';
