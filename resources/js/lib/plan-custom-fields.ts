export interface PlanCustomFieldFormShape {
    key: string
    label: string
    value: string
    type: "text" | "number" | "currency" | "boolean"
    icon?: string
    description?: string
}

export function slugifyPlanCustomFieldKey(label: string): string {
    return label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
}

/** Stable keys for submit: slug from label with per-plan deduplication. */
export function assignPlanCustomFieldKeys<T extends { label: string }>(
    fields: T[],
): (T & { key: string })[] {
    const used = new Set<string>()
    return fields.map((f, i) => {
        let base = slugifyPlanCustomFieldKey(f.label)
        if (!base) base = `custom_field_${i + 1}`
        let key = base
        let n = 2
        while (used.has(key)) {
            key = `${base}_${n++}`
        }
        used.add(key)
        return { ...f, key }
    })
}
