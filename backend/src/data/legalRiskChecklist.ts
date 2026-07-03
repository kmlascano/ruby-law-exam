import type { ContractType } from '../types';

export type RiskRule = {
  ruleId: string;
  contractTypes: ContractType[];
  clauseName: string;
  riskQuestion: string;
  riskIfMissing: string;
  severityIfMissing: 'low' | 'medium' | 'high';
  datasetRationale: string;
};

export const DATASET_INFORMED_APPROACH = [
  {
    name: 'CUAD',
    use: 'Informs the clause categories lawyers commonly review in commercial contracts.',
  },
  {
    name: 'ContractNLI',
    use: 'Informs the evidence-backed decision format: present, missing, or ambiguous with exact supporting text.',
  },
  {
    name: 'MCC',
    use: 'Useful for future contract-type classifier examples, but not loaded at runtime for this lightweight demo.',
  },
  {
    name: 'CLAUSE',
    use: 'Informs the optional judge rubric for catching unsupported or weak legal-risk reasoning.',
  },
] as const;

const STANDARD_CONTRACT_TYPES: ContractType[] = [
  'NDA',
  'Employment',
  'Service Agreement',
  'Lease',
];

const COMMON_CONTRACT_FOUNDATION_RULES: RiskRule[] = [
  {
    ruleId: 'COMMON-PARTIES-001',
    contractTypes: STANDARD_CONTRACT_TYPES,
    clauseName: 'Parties clearly identified',
    riskQuestion: 'Does the contract clearly identify all parties to the agreement?',
    riskIfMissing:
      'The contract does not clearly identify the parties, which may make obligations, rights, and enforcement unclear.',
    severityIfMissing: 'high',
    datasetRationale:
      'Party identification is a foundational contract-quality check because obligations must be tied to identifiable legal persons or entities.',
  },
  {
    ruleId: 'COMMON-AGREEMENT-STRUCTURE-001',
    contractTypes: STANDARD_CONTRACT_TYPES,
    clauseName: 'Clear agreement structure',
    riskQuestion:
      'Does the contract clearly show what is being agreed and that the parties are accepting the same terms?',
    riskIfMissing:
      'The contract does not clearly show what is being agreed, which may create uncertainty about offer, acceptance, and mutual obligations.',
    severityIfMissing: 'medium',
    datasetRationale:
      'A strong contract should clearly express the agreement being made so the parties understand the promise and accepted terms.',
  },
  {
    ruleId: 'COMMON-CONSIDERATION-001',
    contractTypes: STANDARD_CONTRACT_TYPES,
    clauseName: 'Exchange of value or consideration',
    riskQuestion:
      'Does the contract clearly describe what value is exchanged, such as money, services, goods, employment, rent, promises, access, licences, or other commitments?',
    riskIfMissing:
      'The contract does not clearly describe what value is being exchanged, such as payment, goods, services, promises, access, licences, or other consideration.',
    severityIfMissing: 'high',
    datasetRationale:
      'The exchange of value is a foundational contract-quality check because unclear consideration can undermine enforceability or commercial certainty.',
  },
  {
    ruleId: 'COMMON-OBLIGATIONS-001',
    contractTypes: STANDARD_CONTRACT_TYPES,
    clauseName: 'Core obligations',
    riskQuestion: 'Does the contract clearly state what each party must do?',
    riskIfMissing:
      'The contract does not clearly state what each party must do, which may cause disputes about performance.',
    severityIfMissing: 'high',
    datasetRationale:
      'Clear obligations are central to contract review because vague duties make performance and breach difficult to assess.',
  },
  {
    ruleId: 'COMMON-TIMING-001',
    contractTypes: STANDARD_CONTRACT_TYPES,
    clauseName: 'Timing, term, or deadlines',
    riskQuestion:
      'Does the contract state when obligations begin, end, renew, expire, or must be performed?',
    riskIfMissing:
      'The contract does not clearly state when obligations begin, end, or must be performed.',
    severityIfMissing: 'medium',
    datasetRationale:
      'Timing and term provisions reduce disputes about when duties apply and when performance is due.',
  },
  {
    ruleId: 'COMMON-PRICE-001',
    contractTypes: STANDARD_CONTRACT_TYPES,
    clauseName: 'Price, payment, or commercial exchange',
    riskQuestion:
      'Does the contract clearly state price, payment, rent, salary, fees, deposit, compensation, or another commercial exchange?',
    riskIfMissing:
      'The contract does not clearly state price, payment terms, or the commercial exchange between the parties.',
    severityIfMissing: 'medium',
    datasetRationale:
      'Commercial exchange terms are core contract terms and are commonly reviewed for clarity.',
  },
  {
    ruleId: 'COMMON-TERMINATION-001',
    contractTypes: STANDARD_CONTRACT_TYPES,
    clauseName: 'Termination rights',
    riskQuestion:
      'Does the contract explain how the agreement can end early and what happens after termination?',
    riskIfMissing:
      'The contract does not clearly explain how the agreement can be ended early or what happens on termination.',
    severityIfMissing: 'medium',
    datasetRationale:
      'Termination clauses help parties understand exit rights, notice periods, and post-termination consequences.',
  },
  {
    ruleId: 'COMMON-BREACH-REMEDIES-001',
    contractTypes: STANDARD_CONTRACT_TYPES,
    clauseName: 'Breach consequences or remedies',
    riskQuestion:
      'Does the contract explain what happens if a party fails to perform or breaches the agreement?',
    riskIfMissing:
      'The contract does not clearly explain what happens if a party fails to perform its obligations.',
    severityIfMissing: 'medium',
    datasetRationale:
      'Breach and remedy wording helps reduce uncertainty about consequences, cure rights, damages, or other remedies.',
  },
  {
    ruleId: 'COMMON-DISPUTE-001',
    contractTypes: STANDARD_CONTRACT_TYPES,
    clauseName: 'Dispute resolution',
    riskQuestion: 'Does the contract explain how disputes will be resolved?',
    riskIfMissing:
      'The parties may not know the required forum, process, escalation path, mediation, arbitration, or court process for disputes.',
    severityIfMissing: 'medium',
    datasetRationale:
      'Contract review usually checks forum, escalation, arbitration, mediation, court venue, and related dispute provisions.',
  },
  {
    ruleId: 'COMMON-GOVLAW-001',
    contractTypes: STANDARD_CONTRACT_TYPES,
    clauseName: 'Governing law or jurisdiction',
    riskQuestion: 'Does the contract identify the governing law or jurisdiction?',
    riskIfMissing:
      'The contract does not clearly identify governing law or jurisdiction, which may create uncertainty if a dispute arises.',
    severityIfMissing: 'medium',
    datasetRationale:
      'Governing law and jurisdiction are common legal provision categories used in contract-review datasets and legal-risk checklists.',
  },
];

const TYPE_SPECIFIC_LEGAL_RISK_RULES: RiskRule[] = [
  {
    ruleId: 'NDA-CONF-001',
    contractTypes: ['NDA'],
    clauseName: 'Definition of confidential information',
    riskQuestion: 'Does the NDA clearly define what information is confidential?',
    riskIfMissing: 'The agreement may not clearly define what information is protected.',
    severityIfMissing: 'high',
    datasetRationale:
      'CUAD-style clause extraction emphasises confidentiality definitions and related protections.',
  },
  {
    ruleId: 'NDA-PURPOSE-001',
    contractTypes: ['NDA'],
    clauseName: 'Purpose limitation',
    riskQuestion: 'Does the NDA limit use of confidential information to a defined purpose?',
    riskIfMissing:
      'The recipient may be able to use confidential information more broadly than intended.',
    severityIfMissing: 'high',
    datasetRationale: 'Purpose restrictions are a standard NDA risk-control provision.',
  },
  {
    ruleId: 'NDA-SURVIVAL-001',
    contractTypes: ['NDA'],
    clauseName: 'Survival of confidentiality obligations',
    riskQuestion:
      'Does the NDA state whether confidentiality obligations survive termination or expiry?',
    riskIfMissing:
      'Confidentiality obligations may end earlier than the disclosing party expects.',
    severityIfMissing: 'high',
    datasetRationale:
      'ContractNLI-style checks are useful for determining whether survival obligations are present or not mentioned.',
  },
  {
    ruleId: 'NDA-RETURN-001',
    contractTypes: ['NDA'],
    clauseName: 'Return or destruction of materials',
    riskQuestion: 'Does the NDA require return or destruction of confidential information?',
    riskIfMissing:
      'The recipient may not have a clear duty to return or destroy confidential materials.',
    severityIfMissing: 'medium',
    datasetRationale:
      'Return and destruction obligations are standard NDA review points.',
  },

  {
    ruleId: 'EMP-ROLE-001',
    contractTypes: ['Employment'],
    clauseName: 'Role and duties',
    riskQuestion: 'Does the employment agreement describe the employee role and duties?',
    riskIfMissing:
      'The parties may disagree about role expectations or performance obligations.',
    severityIfMissing: 'medium',
    datasetRationale:
      'Employment agreement triage should confirm the core role obligation is defined.',
  },
  {
    ruleId: 'EMP-COMP-001',
    contractTypes: ['Employment'],
    clauseName: 'Compensation and benefits',
    riskQuestion:
      'Does the employment agreement specify salary, payment timing, and key benefits?',
    riskIfMissing: 'Payment and benefit obligations may be unclear.',
    severityIfMissing: 'high',
    datasetRationale:
      'Compensation is a core employment contract term and high-impact missing-clause category.',
  },
  {
    ruleId: 'EMP-TERM-001',
    contractTypes: ['Employment'],
    clauseName: 'Termination rights and notice',
    riskQuestion:
      'Does the employment agreement define termination rights and notice requirements?',
    riskIfMissing: 'The parties may not have a clear process for ending employment.',
    severityIfMissing: 'medium',
    datasetRationale:
      'Termination clauses are key provisions in contract-review datasets and legal-risk checklists.',
  },
  {
    ruleId: 'EMP-IP-001',
    contractTypes: ['Employment'],
    clauseName: 'Intellectual property assignment',
    riskQuestion:
      'Does the employment agreement address ownership of work product or inventions?',
    riskIfMissing: 'Ownership of employee-created IP may be unclear.',
    severityIfMissing: 'medium',
    datasetRationale:
      'IP ownership is a common clause category and material contract-review risk.',
  },
  {
    ruleId: 'EMP-RESTRAINT-001',
    contractTypes: ['Employment'],
    clauseName: 'Post-employment restraint',
    riskQuestion:
      'Does the employment agreement address post-employment restrictions such as non-solicitation, non-compete, confidentiality, client poaching, staff poaching, or misuse of relationships where relevant?',
    riskIfMissing:
      'The employer may have limited contractual protection against post-employment competition, solicitation, or misuse of relationships.',
    severityIfMissing: 'medium',
    datasetRationale:
      'Post-employment restraints are common employment review points, but their absence is usually medium risk unless the role or context creates unusually high exposure.',
  },

  {
    ruleId: 'SERV-SCOPE-001',
    contractTypes: ['Service Agreement'],
    clauseName: 'Scope of services',
    riskQuestion:
      'Does the service agreement define the services, deliverables, project scope, or statement of work?',
    riskIfMissing:
      'The provider and client may disagree about what must be delivered.',
    severityIfMissing: 'high',
    datasetRationale:
      'Scope clauses are central to service agreement classification and review.',
  },
  {
    ruleId: 'SERV-PAY-001',
    contractTypes: ['Service Agreement'],
    clauseName: 'Payment terms',
    riskQuestion:
      'Does the service agreement specify fees, invoice timing, payment due dates, expenses, or late-payment consequences?',
    riskIfMissing:
      'Payment obligations and cashflow expectations may be unclear.',
    severityIfMissing: 'high',
    datasetRationale:
      'Payment terms are standard commercial contract clause categories.',
  },
  {
    ruleId: 'SERV-LIAB-001',
    contractTypes: ['Service Agreement'],
    clauseName: 'Limitation of liability',
    riskQuestion:
      'Does the service agreement include a clear limitation of liability?',
    riskIfMissing:
      'The parties may face uncapped or unclear financial exposure.',
    severityIfMissing: 'high',
    datasetRationale:
      'Limitation of liability is a high-impact contract-review clause and common risk flag.',
  },
  {
    ruleId: 'SERV-LIAB-CAP-001',
    contractTypes: ['Service Agreement'],
    clauseName: 'Commercially appropriate liability cap',
    riskQuestion:
      'Is the liability cap commercially appropriate considering deal value, service criticality, data exposure, exclusions, and carve-outs?',
    riskIfMissing:
      'A liability cap may be absent, unclear, too narrow, too low, too high, one-sided, or commercially under-protective for the affected party.',
    severityIfMissing: 'high',
    datasetRationale:
      'Commercial service agreement review should assess whether liability limits are proportionate, not merely whether a limitation clause exists.',
  },
  {
    ruleId: 'SERV-LOSS-EXCLUSION-001',
    contractTypes: ['Service Agreement'],
    clauseName: 'Loss exclusions and carve-outs',
    riskQuestion:
      'Does the agreement avoid overbroad exclusions of important losses, or include appropriate carve-outs for key risks?',
    riskIfMissing:
      'Broad exclusions may remove practical remedies for important categories of loss.',
    severityIfMissing: 'high',
    datasetRationale:
      'Exclusion clauses can materially affect practical recovery and should be assessed alongside the liability cap.',
  },
  {
    ruleId: 'SERV-INDEM-001',
    contractTypes: ['Service Agreement'],
    clauseName: 'Indemnity',
    riskQuestion:
      'Does the service agreement explain indemnity obligations, limits, triggers, and carve-outs?',
    riskIfMissing:
      'The parties may not know who bears third-party claim risk.',
    severityIfMissing: 'high',
    datasetRationale:
      'Indemnity is a common commercial risk category in contract review.',
  },
  {
    ruleId: 'SERV-IP-001',
    contractTypes: ['Service Agreement'],
    clauseName: 'IP ownership',
    riskQuestion:
      'Does the service agreement define ownership of deliverables, background IP, new IP, licences, and usage rights?',
    riskIfMissing:
      'Ownership or permitted use of deliverables may be unclear.',
    severityIfMissing: 'high',
    datasetRationale:
      'IP ownership is a recurring material clause in commercial contracts.',
  },
  {
    ruleId: 'SERV-DATA-001',
    contractTypes: ['Service Agreement'],
    clauseName: 'Data protection and confidentiality',
    riskQuestion:
      'Does the service agreement address confidential information, data protection, information security, or data handling obligations?',
    riskIfMissing:
      'Sensitive business or personal data may not be handled under clear obligations.',
    severityIfMissing: 'medium',
    datasetRationale:
      'Legal-tech risk triage should flag missing data/confidentiality controls when services involve information handling.',
  },
  {
    ruleId: 'SERV-PRIVACY-001',
    contractTypes: ['Service Agreement'],
    clauseName: 'Privacy and data protection obligations',
    riskQuestion:
      'If the services involve systems, users, client data, personal information, integrations, hosting, analytics, automation, or support, does the agreement include privacy, data protection, security, and breach notification obligations?',
    riskIfMissing:
      'The client may lack clear contractual protection for data handling, security controls, breach response, and privacy compliance.',
    severityIfMissing: 'high',
    datasetRationale:
      'Data and privacy obligations are high-impact in technology, operational, integration, hosting, support, and information-handling service agreements.',
  },
  {
    ruleId: 'SERV-INSURANCE-001',
    contractTypes: ['Service Agreement'],
    clauseName: 'Insurance obligations',
    riskQuestion:
      'Does the service agreement require appropriate insurance for the service profile, such as professional indemnity, public liability, cyber, technology errors and omissions, or workers compensation cover?',
    riskIfMissing:
      'The client may have reduced practical recovery if the provider lacks appropriate insurance for service failures, professional negligence, operational incidents, or data incidents.',
    severityIfMissing: 'medium',
    datasetRationale:
      'Insurance obligations are a common commercial safeguard in service agreements, especially where services are technical, advisory, operational, or data-impacting.',
  },
  {
    ruleId: 'SERV-PERFORMANCE-001',
    contractTypes: ['Service Agreement'],
    clauseName: 'Performance standards and warranties',
    riskQuestion:
      'Does the agreement include clear performance standards, service warranties, acceptance criteria, remedies, service levels, or quality obligations?',
    riskIfMissing:
      'The client may have difficulty enforcing service quality expectations or obtaining remedies for defective performance.',
    severityIfMissing: 'medium',
    datasetRationale:
      'Service agreement review should assess enforceable performance obligations, not merely whether services are generally described.',
  },

  {
    ruleId: 'LEASE-PREMISES-001',
    contractTypes: ['Lease'],
    clauseName: 'Premises description',
    riskQuestion: 'Does the lease clearly identify the leased premises?',
    riskIfMissing: 'The property being leased may be uncertain.',
    severityIfMissing: 'high',
    datasetRationale:
      'Lease review starts with identifying premises, term, rent, and repair obligations.',
  },
  {
    ruleId: 'LEASE-RENT-001',
    contractTypes: ['Lease'],
    clauseName: 'Rent and payment obligations',
    riskQuestion:
      'Does the lease specify rent, payment timing, deposits, outgoings, late-payment consequences, or other payment obligations?',
    riskIfMissing: 'Core payment obligations may be unclear.',
    severityIfMissing: 'high',
    datasetRationale:
      'Rent is a core lease obligation and high-priority missing-clause category.',
  },
  {
    ruleId: 'LEASE-TERM-001',
    contractTypes: ['Lease'],
    clauseName: 'Lease term and renewal',
    riskQuestion:
      'Does the lease specify the term, start date, end date, expiry, renewal rights, and holding-over position?',
    riskIfMissing:
      'The parties may disagree about duration or renewal rights.',
    severityIfMissing: 'high',
    datasetRationale:
      'Term and renewal are standard lease review dimensions.',
  },
  {
    ruleId: 'LEASE-REPAIR-001',
    contractTypes: ['Lease'],
    clauseName: 'Repair and maintenance obligations',
    riskQuestion:
      'Does the lease allocate repair, maintenance, structural repair, non-structural repair, and damage responsibilities?',
    riskIfMissing:
      'The parties may dispute who must repair or maintain the premises.',
    severityIfMissing: 'medium',
    datasetRationale:
      'Repair allocation is a common lease-risk review item.',
  },
];

export const LEGAL_RISK_RULES: RiskRule[] = [
  ...COMMON_CONTRACT_FOUNDATION_RULES,
  ...TYPE_SPECIFIC_LEGAL_RISK_RULES,
];

function uniqueRules(rules: RiskRule[]): RiskRule[] {
  const seen = new Set<string>();

  return rules.filter((rule) => {
    if (seen.has(rule.ruleId)) {
      return false;
    }

    seen.add(rule.ruleId);
    return true;
  });
}

export function getRulesForType(contractType: ContractType): RiskRule[] {
  if (contractType === 'Other') {
    return COMMON_CONTRACT_FOUNDATION_RULES;
  }

  return uniqueRules(
    LEGAL_RISK_RULES.filter((rule) => rule.contractTypes.includes(contractType))
  );
}