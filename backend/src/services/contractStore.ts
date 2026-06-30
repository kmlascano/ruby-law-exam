import type { ContractAnalysis } from '../types';

// Simple in-memory store — replace with a database if needed
export const contractStore = new Map<string, ContractAnalysis>();
