// The trainer PIN gate (SR-08): passed once per browser tab, cleared on sign-out (AuthProvider).

function gateKey(_familyId: string) {
  return 'spielzug.trainer-gate'
}

export function markGate(familyId: string) {
  try {
    sessionStorage.setItem(gateKey(familyId), 'verified')
    return true
  } catch {
    return false
  }
}

export function isGateMarked(familyId: string) {
  try {
    return sessionStorage.getItem(gateKey(familyId)) === 'verified'
  } catch {
    return false
  }
}
