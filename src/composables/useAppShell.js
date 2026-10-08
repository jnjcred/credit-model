// Fælles tilstand for appens skal: navigationspanelet på smalle skærme (under
// 1000 px åbnes sidebjælken fra menuknappen i sidehovedet) og guiden Ny sag.
import { ref } from 'vue'

export const navOpen = ref(false)
export const newCaseOpen = ref(false)

export function openNav () { navOpen.value = true }
export function closeNav () { navOpen.value = false }
export function openNewCase () { newCaseOpen.value = true }
