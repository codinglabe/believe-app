
/**
 * COMPREHENSIVE KNOWLEDGE BASE FOR BELIEVEINUNITY.ORG
 * Contains all static information about the platform, features, and navigation.
 */

export const STATIC_KNOWLEDGE = `

`;

/**
 * Gets the combined knowledge from localStorage (fallback when API unavailable).
 */
export function getFullKnowledge(): string {
  const learned = localStorage.getItem('unity_guide_learned_knowledge') || 'No additional notes yet.';
  return `
${STATIC_KNOWLEDGE}

=== LEARNED KNOWLEDGE (USER PROVIDED) ===
${learned}
  `;
}

/**
 * Fetches full knowledge from Laravel API. Falls back to getFullKnowledge() on failure.
 */
export async function fetchFullKnowledge(): Promise<string> {
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const res = await fetch(`${base}/api/knowledge-base`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('API error');
    const json = await res.json();
    if (json.success && json.knowledge) return json.knowledge;
  } catch {
    // Fallback to local/static knowledge
  }
  return getFullKnowledge();
}

/**
 * Saves new learned knowledge via API. Falls back to localStorage on failure.
 */
export async function saveLearnedKnowledge(newFact: string): Promise<boolean> {
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const res = await fetch(`${base}/api/knowledge-base/learn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ newFact }),
    });
    if (res.ok) return true;
  } catch {
    // Fallback to localStorage
  }
  const existing = localStorage.getItem('unity_guide_learned_knowledge') || '';
  const timestamp = new Date().toLocaleDateString();
  const updated = existing ? `${existing}\n[${timestamp}] ${newFact}` : `[${timestamp}] ${newFact}`;
  localStorage.setItem('unity_guide_learned_knowledge', updated);
  return false;
}

/**
 * Clears all learned knowledge
 */
export function clearLearnedKnowledge(): void {
  localStorage.removeItem('unity_guide_learned_knowledge');
}
